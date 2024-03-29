import { stringify } from 'node:querystring';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    
    return [];
  });
  
  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productsExists = updatedCart.find(product => product.id === productId)

      const stock = await api.get<Stock>(`/stock/${productId}`)

      const stockAmount = stock.data.amount
      const currentAmount = productsExists ? productsExists.amount : 0
      const amount = currentAmount + 1

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      if(productsExists) {
        productsExists.amount = amount
      } else {
        const product = await api.get(`/products/${productId}`)

        const newProduct = {
          ...product.data,
          amount: 1
        }
        updatedCart.push(newProduct)
      }

      if(stock.data.id !== productId) {
        return
      }

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))

    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newProduct = [...cart]
      const itemFiltered = newProduct.filter(product => product.id !== productId)

      const notExist = newProduct.find(product => product.id === productId)
      
      if(!notExist) {
        toast.error('Erro na remoção do produto')
        return
      }
      setCart(itemFiltered)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(itemFiltered))
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if( amount <= 0 ) {
        return;
      } 

      const stock = await api.get(`/stock/${productId}`)
      const stockAmount = stock.data.amount

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }

      const updatedCart = [...cart]
      const productExists = updatedCart.find(product => product.id === productId)
      
      if(!productExists) {
        toast.error('erro')
        return
      }
      
      productExists.amount = amount
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

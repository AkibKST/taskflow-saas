'use client';

import { store } from "@/store/store";
import  Provider, { ProviderProps }  from "react-redux";

export function ReduxProvider({ children }: { children: ProviderProps }) {
  return <ProviderProps store={store}>{children}</Provider>;
}
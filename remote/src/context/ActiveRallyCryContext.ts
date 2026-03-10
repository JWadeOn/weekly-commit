import { createContext, useContext } from 'react'

export const ActiveRallyCryContext = createContext<string | undefined>(undefined)

export const useActiveRallyCry = (): string | undefined => useContext(ActiveRallyCryContext)

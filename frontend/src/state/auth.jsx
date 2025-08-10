import React, { createContext, useContext, useState} from 'react';


const Ctx = createContext({ user: null, login: () => {}, logout: () => {} });


export function AuthProvider({children}) {
    const [user, setUser] = useState(null);
    const login = (userData) => setUser(userData);
    const logout = () => setUser(null);
    return <Ctx.Provider value={{user, login, logout}}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
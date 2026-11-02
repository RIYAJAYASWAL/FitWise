import React, { createContext, useContext, useState, useEffect } from "react";
import { api, getSecretKey, setSecretKey, clearSecretKey } from "../api.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [key, setKey] = useState(() => getSecretKey());
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const keyParam = urlParams.get("key");
    if (keyParam) {
      setSecretKey(keyParam);
    }

    const existingKey = keyParam || getSecretKey();
    if (!existingKey) {
      setLoading(false);
      return;
    }

    api.getStore(existingKey)
      .then((data) => {
        setStore(data);
        setKey(existingKey);
      })
      .catch((err) => {
        console.warn("Failed to validate saved key:", err.message);
        clearSecretKey();
        setKey("");
        setStore(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const connect = async (inputKey) => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      throw new Error("Secret key is required");
    }

    const storeData = await api.getStore(trimmed);
    setSecretKey(trimmed);
    setKey(trimmed);
    setStore(storeData);
    return storeData;
  };

  const disconnect = () => {
    clearSecretKey();
    setKey("");
    setStore(null);
  };

  return (
    <AuthContext.Provider
      value={{
        key,
        store,
        loading,
        isAuthenticated: Boolean(key && store),
        connect,
        disconnect,
        refreshStore: () => api.getStore().then(setStore).catch(() => {}),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "../services/authService";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = React.useReducer(
    (prevState, action) => {
      switch (action.type) {
        case "RESTORE_TOKEN":
          return {
            ...prevState,
            userToken: action.token,
            isLoading: false,
          };
        case "SIGN_IN":
          return {
            ...prevState,
            isSignout: false,
            userToken: action.token,
          };
        case "SIGN_OUT":
          return {
            ...prevState,
            isSignout: true,
            userToken: null,
          };
        default:
          return prevState;
      }
    },
    {
      isLoading: true,
      isSignout: false,
      userToken: null,
    }
  );

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        dispatch({ type: "RESTORE_TOKEN", token });
      } catch (e) {
        console.error("Failed to restore token", e);
      }
    };

    bootstrapAsync();
  }, []);

  const authContext = {
    signIn: async (username, password) => {
      const response = await authService.login(username, password);
      const token = response.data.token;
      const user = response.data.user || response.data;
      await AsyncStorage.setItem("userToken", token);
      if (user) await AsyncStorage.setItem("user", JSON.stringify(user));
      dispatch({ type: "SIGN_IN", token });
    },
    signUp: async (name, username, email, phoneNumber, password) => {
      const response = await authService.register(
        name,
        username,
        email,
        phoneNumber,
        password
      );
      const token = response.data.token;
      const user = response.data.user || response.data;
      await AsyncStorage.setItem("userToken", token);
      if (user) await AsyncStorage.setItem("user", JSON.stringify(user));
      dispatch({ type: "SIGN_IN", token });
    },
    signOut: async () => {
      await authService.logout();
      dispatch({ type: "SIGN_OUT" });
    },
  };

  return (
    <AuthContext.Provider value={{ state, ...authContext }}>
      {children}
    </AuthContext.Provider>
  );
};

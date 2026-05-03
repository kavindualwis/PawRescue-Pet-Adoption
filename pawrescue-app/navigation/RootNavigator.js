import React from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { AuthContext } from "../context/AuthContext";

export const RootNavigator = () => {
  const { state } = React.useContext(AuthContext);

  React.useEffect(() => {
    if (!state.isLoading) {
      if (state.userToken == null) {
        router.replace("/splash");
      } else {
        router.replace("/(tabs)");
      }
    }
  }, [state.userToken, state.isLoading]);

  if (state.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return null;
};


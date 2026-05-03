import Constants from "expo-constants";
import { Platform } from "react-native";

const resolveDevHost = () => {
	const hostUri =
		Constants.expoConfig?.hostUri ||
		Constants.expoConfig?.debuggerHost ||
		Constants.manifest?.debuggerHost;

	if (!hostUri) {
		return null;
	}

	const host = hostUri.split(":")[0];
	return `http://${host}:3001/api`;
};

const localFallback = Platform.select({
	ios: "http://localhost:3001/api",
	android: "http://10.0.2.2:3001/api",
	default: "http://localhost:3001/api",
});

const productionUrl = "https://pawrescue-my-dev-production.up.railway.app/api";

export const API_BASE_URL =
	process.env.EXPO_PUBLIC_API_URL || productionUrl || resolveDevHost() || localFallback;
export const PAYHERE_NOTIFY_URL = `${API_BASE_URL}/payments/notify`;
export const JWT_SECRET = process.env.EXPO_PUBLIC_JWT_SECRET || "";
export const GOOGLE_MAPS_API_KEY = "AIzaSyCZ1MzvV0ndr3tZZo1TyJ8q01HjjOtBCOU";

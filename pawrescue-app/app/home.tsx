import React from "react";
import { useRouter } from "expo-router";

export default function HomePage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace("/splash");
  }, []);

  return null;
}

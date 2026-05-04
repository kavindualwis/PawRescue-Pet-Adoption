import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { authService } from "../services/authService";

interface FormErrors {
  name?: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  confirmPassword?: string;
}

const RegisterScreen = () => {
  const router = useRouter();
  const { signUp } = React.useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState("");
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState(true);

  // Real-time username check
  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length < 3) {
        setUsernameAvailable(null);
        setUsernameError("");
        return;
      }

      setCheckingUsername(true);
      try {
        const response = await authService.checkUsername(formData.username);
        if (response.data.available) {
          setUsernameAvailable(true);
          setUsernameError("");
        } else {
          setUsernameAvailable(false);
          setUsernameError("Username already taken");
        }
      } catch (error) {
        setUsernameAvailable(null);
        setUsernameError("");
      }
      setCheckingUsername(false);
    };

    const debounceTimer = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.username]);

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (usernameAvailable === false) {
      newErrors.username = "Username is not available";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!/^\d{10}$|^\+\d{10,}$/.test(formData.phoneNumber.replace(/\D/g, ""))) {
      newErrors.phoneNumber = "Invalid phone number";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await signUp(
        formData.name,
        formData.username,
        formData.email,
        formData.phoneNumber,
        formData.password
      );
      Alert.alert("Success", "Registration successful!");
    } catch (error: unknown) {
      const err = error as any;
      Alert.alert(
        "Registration Error",
        err.response?.data?.message || "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Curved Pet Image Card */}
          <View style={styles.imageCard}>
            <Image
              source={require("@/assets/images/Register_page.png")}
              style={styles.petImage}
              resizeMode="contain"
            />
          </View>

          {/* Content Container */}
          <View style={styles.contentWrapper}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join our community of pet lovers</Text>
            </View>

            {/* Form Container */}
            <View style={styles.formContainer}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="Full Name"
                  placeholderTextColor="#999"
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  editable={!loading}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              {/* Username Input */}
              <View style={styles.inputGroup}>
                <View style={styles.usernameRowContainer}>
                  <TextInput
                    style={[styles.input, styles.usernameInput, errors.username && styles.inputError]}
                    placeholder="Username"
                    placeholderTextColor="#999"
                    value={formData.username}
                    onChangeText={(text) =>
                      setFormData({ ...formData, username: text.toLowerCase() })
                    }
                    editable={!loading}
                  />
                  {checkingUsername && (
                    <ActivityIndicator size="small" color="#E8A358" style={styles.usernameLoader} />
                  )}
                </View>
                {usernameError && <Text style={styles.errorText}>{usernameError}</Text>}
                {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={formData.email}
                  onChangeText={(text) =>
                    setFormData({ ...formData, email: text })
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.input, errors.phoneNumber && styles.inputError]}
                  placeholder="Phone Number"
                  placeholderTextColor="#999"
                  value={formData.phoneNumber}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phoneNumber: text.replace(/[^0-9]/g, "") })
                  }
                  keyboardType="phone-pad"
                  editable={!loading}
                />
                {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    value={formData.password}
                    onChangeText={(text) =>
                      setFormData({ ...formData, password: text })
                    }
                    secureTextEntry={secureTextEntry}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setSecureTextEntry(!secureTextEntry)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons 
                      name={secureTextEntry ? "eye-off" : "eye"} 
                      size={20} 
                      color="#999" 
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                    placeholder="Confirm Password"
                    placeholderTextColor="#999"
                    value={formData.confirmPassword}
                    onChangeText={(text) =>
                      setFormData({ ...formData, confirmPassword: text })
                    }
                    secureTextEntry={secureConfirmTextEntry}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setSecureConfirmTextEntry(!secureConfirmTextEntry)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons 
                      name={secureConfirmTextEntry ? "eye-off" : "eye"} 
                      size={20} 
                      color="#999" 
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}
              </View>

              {/* Register Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/login")}>
                  <Text style={styles.loginLink}>Log in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageCard: {
    height: 300,
    backgroundColor: "#FFF5E6",
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    overflow: "hidden",
  },
  petImage: {
    width: "100%",
    height: "100%",
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: "#fff",
  },
  inputGroup: {
    marginBottom: 16,
  },
  usernameRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingRight: 12,
  },
  usernameInput: {
    flex: 1,
    margin: 0,
  },
  usernameLoader: {
    marginRight: 8,
  },
  input: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    borderRadius: 8,
    borderWidth: 0,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    margin: 0,
  },
  eyeIcon: {
    padding: 8,
  },
  inputError: {
    borderColor: "#FF3B30",
    backgroundColor: "#FFF5F5",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: "#E8A358",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 12,
  },
  footerText: {
    color: "#666",
    fontSize: 13,
  },
  loginLink: {
    color: "#E8A358",
    fontSize: 13,
    fontWeight: "600",
  },
});

export default RegisterScreen;

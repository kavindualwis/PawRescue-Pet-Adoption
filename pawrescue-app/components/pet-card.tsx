import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

interface Pet {
  _id: string;
  name: string;
  images?: string[];
  status?: string;
  [key: string]: any;
}

const { width } = Dimensions.get("window");
const cardWidth = (width - 32) / 2;

export const PetCard = ({ pet, onPress, onAddPress, actionButtons }: { pet: Pet; onPress?: () => void; onAddPress?: () => void; actionButtons?: React.ReactNode }) => {
  const [liked, setLiked] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const getImageUrl = (imageData: string | undefined): string | any => {
    if (imageData && imageData.startsWith("data:")) {
      return imageData;
    }
    return require("@/assets/images/splash_image.png");
  };

  const displayImage = pet.images && pet.images.length > 0
    ? { uri: getImageUrl(pet.images[0]) }
    : require("@/assets/images/splash_image.png");

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "available":
        return "#27AE60";
      case "adopted":
        return "#3498DB";
      case "rescue-needed":
        return "#E74C3C";
      default:
        return "#95A5A6";
    }
  };

  const formatStatus = (status: string): string => {
    if (status === "rescue-needed") return "Rescue Needed";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {typeof displayImage.uri === "string" ? (
          <Image
            source={displayImage}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={displayImage}
            style={styles.image}
            resizeMode="cover"
          />
        )}

        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => setLiked(!liked)}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={24}
            color={liked ? "#E74C3C" : "#999"}
          />
        </TouchableOpacity>

        {pet.status && (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(pet.status) },
            ]}
          >
            <Text style={styles.statusText}>{formatStatus(pet.status)}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.petName} numberOfLines={1}>
          {pet.name}
        </Text>
        <Text style={styles.breed} numberOfLines={1}>
          {pet.breed}
        </Text>
        <View style={styles.footer}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={12} color={colors.text + '60'} />
            <Text style={styles.location} numberOfLines={1}>{pet.location}</Text>
          </View>
        </View>
        {actionButtons && (
          <View style={styles.actionButtonsContainer}>
            {actionButtons}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (colors: typeof Colors.light & typeof Colors.dark) => StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: colors.card,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  imageContainer: {
    position: "relative",
    height: 180,
    backgroundColor: colors.text + '05',
  },
  image: {
    width: "100%",
    height: "100%",
  },
  likeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.background + 'B3', // 70% opacity
    borderRadius: 20,
    padding: 6,
  },
  statusBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "600",
  },
  content: {
    padding: 12,
  },
  petName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  breed: {
    fontSize: 13,
    color: colors.text + '60',
    marginBottom: 10,
    fontWeight: '500',
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 12,
    color: colors.text + '60',
    flex: 1,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border + '20',
    paddingTop: 12,
  },
});

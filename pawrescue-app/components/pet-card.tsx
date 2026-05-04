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
  price?: number;
  [key: string]: any;
}

const { width } = Dimensions.get("window");
const cardWidth = (width - 32) / 2;

export const PetCard = ({
  pet,
  onPress,
  onAddPress,
  actionButtons,
  isLiked: initialLiked = false,
  onLike
}: {
  pet: Pet;
  onPress?: () => void;
  onAddPress?: () => void;
  actionButtons?: React.ReactNode;
  isLiked?: boolean;
  onLike?: (liked: boolean) => void;
}) => {
  const [liked, setLiked] = useState(initialLiked);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  React.useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  const handleLikePress = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    if (onLike) {
      onLike(newLiked);
    }
  };

  const getImageUrl = (imageData: string | undefined): string | any => {
    if (imageData && imageData.startsWith("data:")) {
      return imageData;
    }
    return require("@/assets/images/splash_image.png");
  };

  const displayImage = pet.images && pet.images.length > 0
    ? { uri: getImageUrl(pet.images[0]) }
    : require("@/assets/images/splash_image.png");

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={[styles.imageContainer, { backgroundColor: colors.secondary + '40' }]}>
        <Image
          source={displayImage}
          style={styles.image}
          resizeMode="cover"
        />

        <TouchableOpacity
          style={styles.likeButton}
          onPress={handleLikePress}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={18}
            color={liked ? colors.error : colors.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.namePriceRow}>
          <Text style={styles.petName} numberOfLines={1}>
            {pet.name}
          </Text>
          <Text style={styles.priceText}>
            {pet.price === 0 ? 'Free' : pet.price ? `Rs.${pet.price}` : 'Free'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.location} numberOfLines={1}>
            {pet.location
              ? pet.location.split(',').slice(-2).join(',').trim()
              : 'Sydney, CA'}
          </Text>
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

const getStyles = (colors: any) => StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  likeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
  namePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  petName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  location: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border + '10',
    paddingTop: 10,
  },
});

import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const slides = [
    {
      id: 0,
      title: 'Find Your Best Pet\nFriend with Us',
      description:
        'Find your best companion at our store! We have a wide selection of loveable and cute pets ready for adoption.',
      image: require('@/assets/images/splash_image.png'),
    },
    {
      id: 1,
      title: 'Discover Amazing Pets',
      description:
        'Browse through our collection of healthy and well-trained pets. Each pet is carefully selected and ready to be part of your family.',
      image: require('@/assets/images/splash_image1.png'),
    },
    {
      id: 2,
      title: 'Start Your Journey',
      description:
        'Join our community of pet lovers and find the perfect companion for your home. Make a difference by giving a pet a loving home.',
      image: require('@/assets/images/splash_image2.png'),
    },
  ];

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
  };

  const handleGetStarted = () => {
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        onScroll={handleScroll}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        style={styles.carousel}
      >
        {slides.map(slide => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.imageContainer}>
              <Image
                source={slide.image}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        {/* Title */}
        <ThemedText style={styles.title}>{slides[currentSlide].title}</ThemedText>

        {/* Description */}
        <ThemedText style={styles.description}>{slides[currentSlide].description}</ThemedText>

        {/* Indicator Dots */}
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentSlide ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Get Started Button */}
        <TouchableOpacity style={styles.startButton} onPress={handleGetStarted}>
          <ThemedText style={styles.startButtonText}>
            Get Started
          </ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  carousel: {
    flex: 1,
  },
  slide: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    height: '100%',
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  image: {
    width: '90%',
    height: '80%',
    maxHeight: 280,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
    marginBottom: 12,
    lineHeight: 36,
  },
  description: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    justifyContent: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#E8A358',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#DDD',
  },
  startButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#E8A358',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

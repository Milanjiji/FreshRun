import React, { useState, useEffect } from 'react';
import { Image, View, ImageStyle, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';

interface TopCropImageProps {
  uri: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TopCropImage: React.FC<TopCropImageProps> = ({ uri, style, containerStyle }) => {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  useEffect(() => {
    if (uri) {
      Image.getSize(
        uri,
        (width, height) => {
          if (height > 0) {
            setAspectRatio(width / height);
          }
        },
        (error) => {
          console.warn('Failed to get image size for top crop:', error);
        }
      );
    }
  }, [uri]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerWidth(width);
      setContainerHeight(height);
    }
  };

  // If image aspect ratio is less than the container aspect ratio,
  // it means the image is taller. In this case, we align it to the top.
  const isTaller =
    aspectRatio !== null &&
    containerWidth !== null &&
    containerHeight !== null &&
    aspectRatio < containerWidth / containerHeight;

  return (
    <View 
      style={[
        { overflow: 'hidden', position: 'relative' }, 
        containerStyle
      ]} 
      onLayout={handleLayout}
    >
      {isTaller ? (
        <Image
          source={{ uri }}
          style={[
            style,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              aspectRatio: aspectRatio,
            },
          ]}
          resizeMode="cover"
        />
      ) : (
        <Image
          source={{ uri }}
          style={[
            style,
            {
              width: '100%',
              height: '100%',
            },
          ]}
          resizeMode="cover"
        />
      )}
    </View>
  );
};

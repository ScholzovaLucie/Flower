import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Path, Circle, Ellipse, G, Rect, Defs, RadialGradient, Stop } from 'react-native-svg';

// ─── Helpers ──────────────────────────────────────────────────────────────

const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

const getProps = (health) => {
  const t = health / 100;

  // Stem height: from 35px (dying) to 110px (thriving)
  const stemHeight = lerp(32, 108, t);

  // Leaf angle: +55° (droopy) → -35° (perky)
  const leafAngle = lerp(55, -35, t);

  // Leaf scale: small wilted → full lush
  const leafScale = lerp(0.45, 1.0, t);

  // Colors
  let leafColor, stemColor, potAccent;
  if (health >= 75) {
    leafColor = '#43A047';
    stemColor = '#2E7D32';
    potAccent = '#F57F17';
  } else if (health >= 50) {
    leafColor = '#7CB342';
    stemColor = '#558B2F';
    potAccent = '#E65100';
  } else if (health >= 30) {
    leafColor = '#C0CA33';
    stemColor = '#827717';
    potAccent = '#BF360C';
  } else if (health >= 15) {
    leafColor = '#FBC02D';
    stemColor = '#F57F17';
    potAccent = '#6D4C41';
  } else {
    leafColor = '#FF8F00';
    stemColor = '#BF360C';
    potAccent = '#4E342E';
  }

  const showFlower = health >= 80;
  const showSecondLeafPair = health >= 28;
  const glowOpacity = health >= 70 ? (health - 70) / 30 : 0;

  return { stemHeight, leafAngle, leafScale, leafColor, stemColor, potAccent, showFlower, showSecondLeafPair, glowOpacity };
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function VirtualPlant({ health = 100, size = 220 }) {
  const props = getProps(health);

  // Pulse animation (only when healthy)
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;
  const pulseRef = useRef(null);
  const swayRef = useRef(null);

  useEffect(() => {
    // Stop previous animations
    if (pulseRef.current) pulseRef.current.stop();
    if (swayRef.current) swayRef.current.stop();

    if (health >= 65) {
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 2200, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 2200, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        ])
      );
      pulseRef.current.start();

      swayRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(swayAnim, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
          Animated.timing(swayAnim, { toValue: -1, duration: 3500, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        ])
      );
      swayRef.current.start();
    } else {
      // Slow drooping sway for unhealthy plants
      pulseAnim.setValue(1);
      swayRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(swayAnim, { toValue: 0.4, duration: 5000, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
          Animated.timing(swayAnim, { toValue: -0.4, duration: 5000, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        ])
      );
      swayRef.current.start();
    }

    return () => {
      if (pulseRef.current) pulseRef.current.stop();
      if (swayRef.current) swayRef.current.stop();
    };
  }, [health]);

  const swayRotate = swayAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-4deg', '4deg'],
  });

  // SVG layout constants (within 200×240 viewBox)
  const cx = 100;
  const stemBaseY = 162;
  const stemTopY = stemBaseY - props.stemHeight;
  const leafMidY = stemBaseY - props.stemHeight * 0.5;
  const leafUpperY = stemBaseY - props.stemHeight * 0.78;

  // Leaf shape (left leaf, extended left from origin 0,0)
  const leafPath = (scale) => {
    const w = 62 * scale;
    const h = 14 * scale;
    return `M 0 0 C ${-w * 0.4} ${-h} ${-w * 0.85} ${-h * 0.6} ${-w} 0 C ${-w * 0.85} ${h * 0.85} ${-w * 0.4} ${h * 0.65} 0 0 Z`;
  };

  const stemPath = `M ${cx} ${stemBaseY} C ${cx - 4} ${stemBaseY - props.stemHeight * 0.4} ${cx + 5} ${stemBaseY - props.stemHeight * 0.7} ${cx} ${stemTopY}`;

  return (
    <Animated.View
      style={{
        transform: [{ scale: pulseAnim }, { rotate: swayRotate }],
        alignItems: 'center',
      }}
    >
      <Svg width={size} height={size * 1.1} viewBox="0 0 200 220">

        {/* Glow behind plant when thriving */}
        {props.glowOpacity > 0 && (
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="45%" r="40%">
              <Stop offset="0%" stopColor="#A5D6A7" stopOpacity={props.glowOpacity * 0.6} />
              <Stop offset="100%" stopColor="#A5D6A7" stopOpacity="0" />
            </RadialGradient>
          </Defs>
        )}
        {props.glowOpacity > 0 && (
          <Ellipse cx={cx} cy={100} rx={70} ry={60} fill="url(#glow)" />
        )}

        {/* === POT === */}
        {/* Rim */}
        <Rect x={57} y={163} width={86} height={11} rx={5} fill="#8D4E27" />
        {/* Body */}
        <Path
          d={`M 63 174 L 137 174 L 128 212 L 72 212 Z`}
          fill="#A0522D"
        />
        {/* Pot highlight */}
        <Path
          d={`M 70 174 L 80 212 L 72 212 Z`}
          fill="rgba(255,255,255,0.12)"
        />
        {/* Pot shadow */}
        <Path
          d={`M 128 174 L 137 174 L 128 212 Z`}
          fill="rgba(0,0,0,0.08)"
        />
        {/* Soil */}
        <Ellipse cx={cx} cy={169} rx={43} ry={7} fill="#4E342E" />
        <Ellipse cx={cx} cy={168} rx={40} ry={5} fill="#5D4037" />

        {/* === STEM === */}
        <Path
          d={stemPath}
          stroke={props.stemColor}
          strokeWidth={5.5}
          fill="none"
          strokeLinecap="round"
        />

        {/* === LOWER LEAVES === */}
        {/* Left lower leaf */}
        <G transform={`translate(${cx}, ${leafMidY}) rotate(${props.leafAngle})`}>
          <Path d={leafPath(props.leafScale)} fill={props.leafColor} />
        </G>
        {/* Right lower leaf (mirror) */}
        <G transform={`translate(${cx}, ${leafMidY}) scale(-1, 1) rotate(${-props.leafAngle})`}>
          <Path d={leafPath(props.leafScale)} fill={props.leafColor} />
        </G>

        {/* === UPPER LEAVES === */}
        {props.showSecondLeafPair && (
          <>
            <G transform={`translate(${cx}, ${leafUpperY}) rotate(${props.leafAngle * 0.75})`}>
              <Path d={leafPath(props.leafScale * 0.78)} fill={props.leafColor} />
            </G>
            <G transform={`translate(${cx}, ${leafUpperY}) scale(-1, 1) rotate(${-props.leafAngle * 0.75})`}>
              <Path d={leafPath(props.leafScale * 0.78)} fill={props.leafColor} />
            </G>
          </>
        )}

        {/* === FLOWER (only when thriving) === */}
        {props.showFlower && (() => {
          const fx = cx;
          const fy = stemTopY;
          const petalColor = health >= 90 ? '#EC407A' : '#FF7043';
          const petalOffsets = [
            [0, -13], [9, -9], [13, 0], [9, 9], [0, 13], [-9, 9], [-13, 0], [-9, -9],
          ];
          return (
            <G>
              {petalOffsets.map(([dx, dy], i) => (
                <Ellipse
                  key={i}
                  cx={fx + dx}
                  cy={fy + dy}
                  rx={5.5}
                  ry={4}
                  fill={petalColor}
                  transform={`rotate(${i * 45}, ${fx + dx}, ${fy + dy})`}
                />
              ))}
              <Circle cx={fx} cy={fy} r={7} fill="#FDD835" />
              <Circle cx={fx} cy={fy} r={4} fill="#F9A825" />
            </G>
          );
        })()}

        {/* === WATER DROPS when freshly watered (health 100) === */}
        {health >= 98 && (
          <>
            <Circle cx={cx - 20} cy={stemTopY + 30} r={3} fill="#64B5F6" opacity={0.7} />
            <Circle cx={cx + 25} cy={stemTopY + 50} r={2.5} fill="#64B5F6" opacity={0.6} />
            <Circle cx={cx - 10} cy={stemTopY + 65} r={2} fill="#64B5F6" opacity={0.5} />
          </>
        )}

        {/* === SAD DROPS when dying (health < 20) === */}
        {health < 20 && (
          <>
            <Path d={`M ${cx - 22} 185 Q ${cx - 24} 192 ${cx - 22} 196 Q ${cx - 20} 192 ${cx - 22} 185`} fill="#FFB74D" opacity={0.6} />
            <Path d={`M ${cx + 18} 182 Q ${cx + 16} 189 ${cx + 18} 193 Q ${cx + 20} 189 ${cx + 18} 182`} fill="#FFB74D" opacity={0.6} />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}

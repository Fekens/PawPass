import {PropsWithChildren} from 'react';import {SafeAreaView,ScrollView,StyleSheet,ViewStyle} from 'react-native';import {colors} from '@/theme';
export function Screen({children,contentStyle}:PropsWithChildren<{contentStyle?:ViewStyle}>){return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={[styles.content,contentStyle]} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView>}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.cream},content:{padding:20,gap:16}});

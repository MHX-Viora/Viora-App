import type { StyleProp, ViewStyle } from 'react-native';
export type SvgaPlayerProps = { url: string; onFinished: () => void; style?: StyleProp<ViewStyle>; fillWidth?: boolean };
export declare function SvgaPlayer(props: SvgaPlayerProps): React.JSX.Element;

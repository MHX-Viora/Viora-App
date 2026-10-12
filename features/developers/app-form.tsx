import { View } from 'react-native';
import { ConsoleButton, ConsoleText, Field } from './console-ui';
import type { HybridConfig } from './mini-app';
import type { Category, Permission } from '../mini-apps/types';

export const blankApp: HybridConfig = { name: '', slug: '', description: '', iconUrl: '', coverUrl: '', webUrl: '', callbackUrl: '', allowedDomains: [], permissions: [], isFeatured: false,
  authenticationMode: 'Independent', callbackUrls: [], allowedOrigins: [], clientAuthenticationMethod: 'None', version: 0, supportEmail: '', privacyPolicyUrl: '', termsUrl: '', ageRating: 'Everyone', integrationType: 'Website', ssoMode: 'Disabled', autoLogin: false };
export function AppForm({ value, onChange, categories, permissions, disabled }: { value: HybridConfig; onChange: (value: HybridConfig) => void; categories: Category[]; permissions: Permission[]; disabled: boolean }) {
  const set = <K extends keyof HybridConfig>(key: K, input: HybridConfig[K]) => onChange({ ...value, [key]: input });
  return <>
    {([['name', 'Tên ứng dụng'], ['slug', 'Slug'], ['description', 'Mô tả'], ['iconUrl', 'URL icon HTTPS'], ['coverUrl', 'URL ảnh giới thiệu HTTPS'], ['webUrl', 'Entry URL HTTPS'], ['supportEmail', 'Email hỗ trợ'], ['privacyPolicyUrl', 'Chính sách bảo mật HTTPS'], ['termsUrl', 'Điều khoản HTTPS'], ['developmentUrl', 'URL môi trường phát triển HTTPS']] as const).map(([key, label]) => <Field key={key} label={label} value={String(value[key] ?? '')} onChange={input => set(key, input)} editable={!disabled} multiline={key === 'description'} />)}
    <ConsoleText>Danh mục</ConsoleText><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{categories.map(category => <ConsoleButton key={category.id} label={category.name} disabled={disabled} primary={value.categoryId === category.id} onPress={() => set('categoryId', category.id)} />)}</View>
    <Field label="Domain cho phép (mỗi dòng một host)" value={value.allowedDomains.join('\n')} onChange={text => set('allowedDomains', text.split('\n'))} multiline editable={!disabled} />
    <Field label="Ảnh giới thiệu HTTPS (tối đa 8, mỗi dòng một URL)" value={(value.screenshots ?? []).join('\n')} onChange={text => set('screenshots', text.split('\n').filter(Boolean))} multiline editable={!disabled} />
    <Field label="Origin bridge đã đăng ký (mỗi dòng một HTTPS origin)" value={value.allowedOrigins.join('\n')} onChange={text => set('allowedOrigins', text.split('\n'))} multiline editable={!disabled} />
    <View style={{ flexDirection: 'row', gap: 8 }}><ConsoleButton label="Đăng nhập riêng" disabled={disabled} primary={value.authenticationMode === 'Independent'} onPress={() => onChange({ ...value, authenticationMode: 'Independent', ssoMode: 'Disabled', autoLogin: false, permissions: [] })} /><ConsoleButton label="ANKT SSO" disabled={disabled} primary={value.authenticationMode === 'AnktSso'} onPress={() => onChange({ ...value, authenticationMode: 'AnktSso', ssoMode: 'Optional', permissions: ['identity.login'], integrationType: 'Sso' })} /></View>
    {value.authenticationMode === 'AnktSso' && <>
      <Field label="Callback URL chính xác (mỗi dòng một URL)" value={value.callbackUrls.join('\n')} onChange={text => { const callbacks = text.split('\n'); onChange({ ...value, callbackUrls: callbacks, callbackUrl: callbacks[0] ?? '' }); }} multiline editable={!disabled} />
      <View style={{ flexDirection: 'row', gap: 8 }}>{(['Optional', 'Required'] as const).map(mode => <ConsoleButton label={mode === 'Optional' ? 'SSO tùy chọn' : 'Bắt buộc SSO'} key={mode} primary={value.ssoMode === mode} disabled={disabled} onPress={() => set('ssoMode', mode)} />)}</View>
      <ConsoleButton label={value.autoLogin ? '✓ Tự đăng nhập đang bật' : 'Bật tự đăng nhập'} disabled={disabled} onPress={() => set('autoLogin', !value.autoLogin)} />
      <View style={{ flexDirection: 'row', gap: 8 }}><ConsoleButton label="Public client · PKCE" disabled={disabled} primary={value.clientAuthenticationMethod === 'None'} onPress={() => set('clientAuthenticationMethod', 'None')} /><ConsoleButton label="Backend client · secret" disabled={disabled} primary={value.clientAuthenticationMethod === 'ClientSecretPost'} onPress={() => set('clientAuthenticationMethod', 'ClientSecretPost')} /></View>
      <ConsoleText>Quyền đề nghị</ConsoleText>{permissions.map(permission => <ConsoleButton key={permission.code} label={`${value.permissions.includes(permission.code) ? '✓ ' : ''}${permission.name}`} disabled={disabled || permission.code === 'identity.login'} onPress={() => set('permissions', value.permissions.includes(permission.code) ? value.permissions.filter(code => code !== permission.code) : [...value.permissions, permission.code])} />)}
    </>}
  </>;
}

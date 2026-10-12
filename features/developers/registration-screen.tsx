import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ConsoleButton, ConsoleShell, ConsoleText, Field } from './console-ui';
import { developerApi } from './platform-api';
import type { DeveloperInput, DeveloperProfile } from './mini-app';
import type { DeveloperTerms, EmailVerificationChallenge } from './developer-platform';

const initial: DeveloperInput = { name: '', email: '', phone: '', country: 'Việt Nam', partnerType: 'Individual' };
export default function DeveloperRegistrationScreen() {
  const [form, setForm] = useState<DeveloperInput>(initial); const [profile, setProfile] = useState<DeveloperProfile>(); const [terms, setTerms] = useState<DeveloperTerms>();
  const [challenge, setChallenge] = useState<EmailVerificationChallenge>(); const [code, setCode] = useState(''); const [accepted, setAccepted] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const apply = (p: DeveloperProfile) => { setDirty(false); setProfile(p); setForm({ ...p, version: p.registrationVersion, accountId: undefined, companyName: p.companyName ?? undefined, phone: p.phone ?? undefined, website: p.website ?? undefined }); };
  useEffect(() => { let active = true; void developerApi.profile().then(p => { if (active) apply(p); }).catch(e => { if (active && e.status !== 404) setError(e.message); }); void developerApi.terms().then(t => { if (active) setTerms(t); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  const action = async (fn: () => Promise<void>) => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Không thể thực hiện yêu cầu.'); } finally { setBusy(false); } };
  const set = (key: keyof DeveloperInput, value: string) => { setDirty(true); setForm(f => ({ ...f, [key]: value })); }; const pending = profile?.registrationStatus === 'PendingReview';
  return <ConsoleShell title="Hồ sơ Developer" error={error} busy={busy}>
    {profile && <><ConsoleText>Trạng thái: {profile.registrationStatus} · Vai trò: {profile.membershipRole}</ConsoleText>{profile.publicReason && <ConsoleText>{profile.publicReason}</ConsoleText>}</>}
    <View style={{ flexDirection: 'row', gap: 12 }}><ConsoleButton label="Cá nhân" disabled={busy || pending} primary={form.partnerType === 'Individual'} onPress={() => set('partnerType', 'Individual')} /><ConsoleButton label="Doanh nghiệp" disabled={busy || pending} primary={form.partnerType === 'Business'} onPress={() => set('partnerType', 'Business')} /></View>
    {([['name', 'Tên hiển thị'], ['email', 'Email liên hệ'], ['phone', 'Số điện thoại'], ['country', 'Quốc gia'], ['website', 'Website HTTPS']] as const).map(([key, label]) => <Field key={key} label={label} value={String(form[key] ?? '')} onChange={value => set(key, value)} editable={!pending} />)}
    {form.partnerType !== 'Individual' && ([['legalName', 'Tên pháp lý'], ['businessRegistrationNumber', 'Mã đăng ký doanh nghiệp'], ['address', 'Địa chỉ'], ['representativeName', 'Người đại diện']] as const).map(([key, label]) => <Field key={key} label={label} value={String(form[key] ?? '')} onChange={value => set(key, value)} editable={!pending} />)}
    {!pending && <>
      <ConsoleButton label="Lưu bản nháp" disabled={busy} onPress={() => void action(async () => apply(await developerApi.draft(form)))} primary />
      {dirty && <ConsoleText>Lưu bản nháp trước khi xác minh email hoặc gửi xét duyệt.</ConsoleText>}
      <ConsoleButton label="Gửi mã xác minh email" disabled={busy || dirty || !profile} onPress={() => void action(async () => setChallenge(await developerApi.requestEmail(form.email)))} />
      {challenge && <><ConsoleText>Mã hết hạn lúc {new Date(challenge.expiresAt).toLocaleTimeString('vi-VN')}.</ConsoleText><Field label="Mã xác minh" value={code} onChange={setCode} /><ConsoleButton label="Xác minh email" disabled={busy} onPress={() => void action(async () => { await developerApi.confirmEmail(challenge.verificationId, code); setCode(''); setChallenge(undefined); apply(await developerApi.profile()); })} /></>}
      {terms?.documents.map(document => <View key={document.id}><ConsoleText>{document.title}</ConsoleText><ConsoleText>{document.content}</ConsoleText></View>)}
      <ConsoleButton label={accepted ? '✓ Đã đồng ý điều khoản' : 'Đồng ý điều khoản Developer'} disabled={busy} onPress={() => setAccepted(!accepted)} />
      <ConsoleButton label="Gửi hồ sơ xét duyệt" primary disabled={busy || dirty || !accepted || !profile?.contactEmailVerified || !terms} onPress={() => void action(async () => apply(await developerApi.submitProfile(profile!.registrationVersion!, terms!.version)))} />
    </>}
    {profile?.reviewHistory?.map(event => <ConsoleText key={event.id}>{new Date(event.createdAt).toLocaleString('vi-VN')} · {event.status} · {event.reason}</ConsoleText>)}
  </ConsoleShell>;
}

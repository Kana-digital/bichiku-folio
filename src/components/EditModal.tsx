import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { SECTORS } from '../constants/sectors';
import { formatExpiryDisplay, parseExpiryInput, toWareki } from '../utils/date';
import { StockItem } from '../types';
import { WheelPicker } from './WheelPicker';

const LOCATIONS = ['パントリー', '防災リュック', 'クローゼット', '押入れ', '車', 'その他'];

const now = new Date();
const YEAR_ITEMS = Array.from({ length: 12 }, (_, i) => ({
  label: `${now.getFullYear() + i}`,
  value: now.getFullYear() + i,
}));
const MONTH_ITEMS = Array.from({ length: 12 }, (_, i) => ({
  label: `${i + 1}月`,
  value: i + 1,
}));

interface EditModalProps {
  visible: boolean;
  item: StockItem | null;
  onClose: () => void;
  onSave: (updated: StockItem) => void;
  onDelete: (id: number) => void;
}

export const EditModal = ({ visible, item, onClose, onSave, onDelete }: EditModalProps) => {
  const [name, setName] = useState('');
  const [sec, setSec] = useState('staple');
  const [qty, setQty] = useState('1');
  const [kcal, setKcal] = useState('0');
  const [waterL, setWaterL] = useState('0');
  const [expiry, setExpiry] = useState('');
  const [loc, setLoc] = useState('パントリー');
  const [noExpiry, setNoExpiry] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear() + 1);
  const [pickerMonth, setPickerMonth] = useState(1);
  const [pickerDay, setPickerDay] = useState(1);

  // アイテムが変わったらフォームに反映
  useEffect(() => {
    if (item) {
      setName(item.name);
      setSec(item.sec);
      setQty(item.qty.toString());
      setKcal(item.kcal.toString());
      setWaterL(item.waterL.toString());
      const isNoExp = item.expiry === '9999-12-31';
      setNoExpiry(isNoExp);
      if (isNoExp) {
        setExpiry('');
      } else {
        setExpiry(item.expiry.replace(/-/g, ''));
      }
      setLoc(item.loc);
      setShowDatePicker(false);
      setShowCategoryPicker(false);
    }
  }, [item]);

  const maxDay = new Date(pickerYear, pickerMonth, 0).getDate();
  const clampedDay = Math.min(pickerDay, maxDay);
  const dayItems = Array.from({ length: maxDay }, (_, i) => ({
    label: `${i + 1}日`,
    value: i + 1,
  }));

  const applyDatePicker = () => {
    const m = pickerMonth.toString().padStart(2, '0');
    const d = clampedDay.toString().padStart(2, '0');
    setExpiry(`${pickerYear}${m}${d}`);
    setShowDatePicker(false);
  };

  const handleSave = () => {
    if (!item || !name) return;
    const finalExpiry = noExpiry ? '9999-12-31' : parseExpiryInput(expiry);
    if (!finalExpiry) return;
    onSave({
      ...item,
      name,
      sec,
      qty: Number(qty) || 1,
      kcal: Number(kcal) || 0,
      waterL: Number(waterL) || 0,
      expiry: finalExpiry,
      loc,
    });
  };

  const handleDelete = () => {
    if (!item) return;
    Alert.alert('削除確認', `「${item.name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  };

  const expiryParsed = parseExpiryInput(expiry);
  const expiryWareki = expiryParsed ? toWareki(expiryParsed) : '';

  // item が null の時は何もレンダリングしない（クラッシュ防止）
  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>商品を編集</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {/* 商品名 */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>商品名</Text>
              <TextInput
                style={styles.input}
                placeholder="商品名を入力"
                placeholderTextColor={COLORS.textSub}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* カテゴリ + 数量 */}
            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>カテゴリ</Text>
                <TouchableOpacity
                  style={styles.select}
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.selectText}>
                      {SECTORS.find(s => s.id === sec)?.icon} {SECTORS.find(s => s.id === sec)?.name || '主食'}
                    </Text>
                    <Text style={{ fontSize: 10, color: COLORS.textSub }}>▼</Text>
                  </View>
                </TouchableOpacity>
                {showCategoryPicker && (
                  <View style={styles.pickerDropdown}>
                    {SECTORS.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.pickerOption,
                          sec === s.id && { backgroundColor: COLORS.accent + '20' },
                        ]}
                        onPress={() => { setSec(s.id); setShowCategoryPicker(false); }}
                      >
                        <Text style={[styles.pickerOptionText, sec === s.id && { color: COLORS.accent }]}>
                          {s.icon} {s.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>数量</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor={COLORS.textSub}
                  value={qty}
                  onChangeText={setQty}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* カロリー + 水量 */}
            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>カロリー</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={COLORS.textSub}
                  value={kcal}
                  onChangeText={setKcal}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>水量 (L)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={COLORS.textSub}
                  value={waterL}
                  onChangeText={setWaterL}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* 賞味期限 */}
            <View style={styles.formGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.label}>賞味期限</Text>
                <TouchableOpacity
                  style={[styles.noExpiryChip, noExpiry && styles.noExpiryChipActive]}
                  onPress={() => setNoExpiry(!noExpiry)}
                >
                  <Text style={[styles.noExpiryChipText, noExpiry && styles.noExpiryChipTextActive]}>
                    期限なし
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }, noExpiry && { opacity: 0.4 }]}
                  placeholder="20270615"
                  placeholderTextColor={COLORS.textSub}
                  value={expiry}
                  onChangeText={(t) => { setExpiry(t); if (noExpiry) setNoExpiry(false); }}
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  style={[styles.datePickerButton, noExpiry && { opacity: 0.4 }]}
                  onPress={() => { if (noExpiry) setNoExpiry(false); setShowDatePicker(!showDatePicker); }}
                >
                  <Text style={styles.datePickerButtonText}>📅 選択</Text>
                </TouchableOpacity>
              </View>
              {expiry && !showDatePicker && !noExpiry ? (
                <Text style={styles.expiryFormatted}>
                  {formatExpiryDisplay(expiry.replace(/\D/g, ''))}
                  {expiryWareki && ` (${expiryWareki})`}
                </Text>
              ) : null}

              {showDatePicker && (
                <View style={styles.wheelContainer}>
                  <View style={styles.wheelRow}>
                    <WheelPicker
                      items={YEAR_ITEMS}
                      selectedValue={pickerYear}
                      onValueChange={setPickerYear}
                      width={90}
                    />
                    <WheelPicker
                      items={MONTH_ITEMS}
                      selectedValue={pickerMonth}
                      onValueChange={setPickerMonth}
                      width={70}
                    />
                    <WheelPicker
                      items={dayItems}
                      selectedValue={clampedDay}
                      onValueChange={setPickerDay}
                      width={70}
                    />
                  </View>
                  <Text style={styles.wheelPreview}>
                    {pickerYear}年{pickerMonth}月{clampedDay}日
                  </Text>
                  <TouchableOpacity style={styles.dateApplyButton} onPress={applyDatePicker}>
                    <Text style={styles.dateApplyButtonText}>この日付で設定</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 保管場所 */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>保管場所</Text>
              <View style={styles.locChipsContainer}>
                {LOCATIONS.map((l) => (
                  <TouchableOpacity
                    key={l}
                    style={[styles.locChip, loc === l && styles.locChipActive]}
                    onPress={() => setLoc(l)}
                  >
                    <Text style={[styles.locChipText, loc === l && styles.locChipTextActive]}>
                      {l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSave}>
              <Text style={styles.submitButtonText}>保存</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>この商品を削除</Text>
            </TouchableOpacity>
            <Text style={styles.consumeHint}>消費の場合はホーム画面で入力してください</Text>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%', paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  closeButton: { fontSize: 24, color: COLORS.textSub },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 11, color: COLORS.textSub, marginBottom: 4 },
  input: { backgroundColor: COLORS.bg, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, fontSize: 12 },
  row: { flexDirection: 'row' },
  select: { width: '100%', backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  selectText: { fontSize: 12, color: COLORS.text },
  pickerDropdown: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginTop: 4, overflow: 'hidden' },
  pickerOption: { paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerOptionText: { fontSize: 12, color: COLORS.text },
  expiryFormatted: { fontSize: 10, color: COLORS.textSub, marginTop: 4 },
  datePickerButton: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' },
  datePickerButtonText: { fontSize: 11, color: COLORS.accent, fontWeight: '600' },
  wheelContainer: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  wheelRow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  wheelPreview: { fontSize: 13, fontWeight: '600', color: COLORS.accent, marginTop: 8, marginBottom: 8 },
  dateApplyButton: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center', width: '100%' },
  dateApplyButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.bg },
  locChipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  locChip: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  locChipActive: { backgroundColor: COLORS.accent + '20', borderColor: COLORS.accent },
  locChipText: { fontSize: 11, color: COLORS.textSub },
  locChipTextActive: { color: COLORS.accent, fontWeight: '600' },
  noExpiryChip: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  noExpiryChipActive: { backgroundColor: COLORS.accent + '20', borderColor: COLORS.accent },
  noExpiryChipText: { fontSize: 10, color: COLORS.textSub },
  noExpiryChipTextActive: { color: COLORS.accent, fontWeight: '600' },
  submitButton: { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 10, marginTop: 8 },
  submitButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.bg, textAlign: 'center' },
  deleteButton: { marginTop: 12, paddingVertical: 10, alignItems: 'center' },
  deleteButtonText: { fontSize: 11, color: COLORS.textSub },
  consumeHint: { fontSize: 9, color: COLORS.textSub, textAlign: 'center', marginTop: 4 },
});

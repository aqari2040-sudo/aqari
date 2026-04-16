import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';

interface Category {
  id: string;
  name: string;
}

interface Contract {
  unit_id: string;
  unit_number: string;
}

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#16a34a' },
  { value: 'medium', label: 'Medium', color: '#ca8a04' },
  { value: 'high', label: 'High', color: '#ea580c' },
  { value: 'urgent', label: 'Urgent', color: '#dc2626' },
] as const;

type Priority = 'low' | 'medium' | 'high' | 'urgent';

const uploadPhoto = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const fileName = `maintenance/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabase.storage.from('maintenance-photos').upload(fileName, blob, {
    contentType: 'image/jpeg',
  });
  if (error) throw error;
  const { data } = supabase.storage.from('maintenance-photos').getPublicUrl(fileName);
  return data.publicUrl;
};

export default function NewMaintenanceRequestScreen() {
  const queryClient = useQueryClient();

  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const { data: contract, isLoading: contractLoading } = useQuery<Contract>({
    queryKey: ['tenant-contract-unit'],
    queryFn: async () => {
      const res = await apiClient.get('/tenants/me/contract');
      return res.data;
    },
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['maintenance-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/maintenance/categories');
      return res.data;
    },
  });

  const addPhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0]]);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos.');
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0]]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!description.trim()) throw new Error('Please describe the issue.');
      if (!category) throw new Error('Please select a category.');

      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await Promise.all(photos.map((p) => uploadPhoto(p.uri)));
      }

      const payload: Record<string, unknown> = {
        category,
        priority,
        description: description.trim(),
        photo_urls: photoUrls,
      };
      if (contract?.unit_id) {
        payload.unit_id = contract.unit_id;
      }

      const res = await apiClient.post('/maintenance', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      const id = data?.id ?? data?.request_id;
      if (id) {
        router.replace(`/maintenance/${id}`);
      } else {
        router.back();
      }
    },
    onError: (err: unknown) => {
      const anyErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (anyErr?.response?.status === 409) {
        Alert.alert(
          'Duplicate Request',
          'A similar maintenance request already exists for this unit. Please check your existing requests.',
          [{ text: 'View Requests', onPress: () => router.back() }, { text: 'OK' }]
        );
        return;
      }
      const msg =
        anyErr?.response?.data?.message ??
        (err instanceof Error ? err.message : 'Failed to submit request.');
      Alert.alert('Error', msg);
    },
  });

  const isLoading = contractLoading || categoriesLoading;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>New Maintenance Request</Text>

      {/* Unit info */}
      {contract?.unit_number ? (
        <View style={styles.unitBanner}>
          <Text style={styles.unitBannerText}>Unit: {contract.unit_number}</Text>
        </View>
      ) : null}

      {/* Category */}
      <Text style={styles.label}>Category *</Text>
      {categoriesLoading ? (
        <ActivityIndicator color="#2563EB" style={{ marginBottom: 16 }} />
      ) : (
        <View style={styles.chipGrid}>
          {(categories && categories.length > 0
            ? categories
            : [
                { id: 'plumbing', name: 'Plumbing' },
                { id: 'electrical', name: 'Electrical' },
                { id: 'hvac', name: 'HVAC' },
                { id: 'structural', name: 'Structural' },
                { id: 'appliances', name: 'Appliances' },
                { id: 'other', name: 'Other' },
              ]
          ).map((cat) => {
            const isSelected = category === cat.name || category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setCategory(cat.name ?? cat.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Priority */}
      <Text style={styles.label}>Priority *</Text>
      <View style={styles.priorityRow}>
        {PRIORITIES.map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[
              styles.priorityBtn,
              priority === p.value && { backgroundColor: p.color, borderColor: p.color },
            ]}
            onPress={() => setPriority(p.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.priorityBtnText, priority === p.value && { color: '#fff' }]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description */}
      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the issue in detail (location, severity, when it started...)"
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />

      {/* Photos */}
      <Text style={styles.label}>Photos (up to 5)</Text>
      <View style={styles.photosRow}>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoThumb}>
            <Image source={{ uri: photo.uri }} style={styles.photoImage} resizeMode="cover" />
            <TouchableOpacity
              style={styles.photoRemoveBtn}
              onPress={() => removePhoto(index)}
              activeOpacity={0.7}
            >
              <Text style={styles.photoRemoveText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 5 && (
          <View style={styles.addPhotoBtns}>
            <TouchableOpacity style={styles.addPhotoBtn} onPress={takePhoto} activeOpacity={0.7}>
              <Text style={styles.addPhotoIcon}>📷</Text>
              <Text style={styles.addPhotoLabel}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addPhotoBtn} onPress={addPhoto} activeOpacity={0.7}>
              <Text style={styles.addPhotoIcon}>🖼️</Text>
              <Text style={styles.addPhotoLabel}>Gallery</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Button
        title={mutation.isPending ? 'Submitting...' : 'Submit Request'}
        onPress={() => mutation.mutate()}
        loading={mutation.isPending}
        disabled={mutation.isPending || !description.trim() || !category}
        style={{ marginTop: 16 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },

  unitBanner: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  unitBannerText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },

  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  chipSelected: { borderColor: '#2563EB', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextSelected: { color: '#2563EB', fontWeight: '600' },

  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  priorityBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  textArea: { minHeight: 110, paddingTop: 12 },

  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  photoThumb: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  photoImage: { width: '100%', height: '100%' },
  photoRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 16, lineHeight: 20, fontWeight: '700' },
  addPhotoBtns: { flexDirection: 'row', gap: 8 },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIcon: { fontSize: 22, marginBottom: 2 },
  addPhotoLabel: { fontSize: 11, color: '#6b7280' },
});

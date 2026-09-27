import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Sheet } from '../../components/ui/Sheet';
import { Icon } from '../../components/Icon';
import { toast } from '../../components/toast';
import { apiService } from '../../services/api';
import { useAppState } from '../../state/AppStateContext';
import { useTheme } from '../../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';
import { PRIORITY_CONFIG } from '../../lib/constants';

interface SearchProps {
  visible: boolean;
  onClose: () => void;
  onOpenTask: (taskId: string) => void;
}

/**
 * SearchScreen — mobile port of web `CommandBar` (⌘K):
 * debounced apiService.search, tap a result to open the task (and jump to its project
 * when possible, just like the web's selection flow).
 */
export const SearchScreen: React.FC<SearchProps> = ({ visible, onClose, onOpenTask }) => {
  const { colors, isDark } = useTheme();
  const { projects, selectProject } = useAppState();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setResults([]);
      setSearched(false);
      setTimeout(() => inputRef.current?.focus(), 220);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res: any = await apiService.search(q);
        // search returns {tasks, projects, comments} buckets (web flattens them)
        const tasks = res?.tasks ?? [];
        const projs = res?.projects ?? [];
        const merged = [
          ...projs.map((p: any) => ({ ...p, __kind: 'project' })),
          ...tasks.map((t: any) => ({ ...t, __kind: 'task' })),
        ];
        setResults(merged);
        setSearched(true);
      } catch (err: any) {
        toast.error(err.message || 'Erreur de recherche');
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [query, visible]);

  const handleSelect = (item: any) => {
    if (item.__kind === 'project') {
      // jump to the project like the web does
      const proj = projects.find((p) => p.id === item.id) ?? item;
      selectProject(proj as any);
      onClose();
      return;
    }
    // task: also select its project when we know it (web does this too)
    const projId = item.projectId;
    if (projId) {
      const proj = projects.find((p) => p.id === projId);
      if (proj) selectProject(proj);
    }
    onOpenTask(item.id);
  };

  return (
    <Sheet visible={visible} onClose={onClose} heightFraction={0.85}>
      {/* search input styled like the web ⌘K bar */}
      <View style={[styles.inputRow, { backgroundColor: colors.surface3, borderColor: colors.border }]}>
        <Icon name="Search" size={16} color={colors.textMuted} />
        <TextInput
          ref={inputRef}
          placeholder={isDark ? 'Rechercher une tâche, un projet…' : 'Rechercher une tâche, un projet…'}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          style={[styles.input, { color: colors.text }]}
        />
        {!!query && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Icon name="X" size={14} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* results */}
      {loading && query.trim() ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>Recherche en cours…</Text>
      ) : !query.trim() ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>Commencez à taper pour rechercher dans vos projets et tâches.</Text>
      ) : searched && results.length === 0 ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>Aucun résultat pour « {query} ».</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r, i) => r.id ?? String(i)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 6, paddingTop: 10, paddingBottom: 16 }}
          renderItem={({ item }) => {
            const isTask = item.__kind === 'task';
            const prio = isTask && item.priority ? (PRIORITY_CONFIG as any)[item.priority] : null;
            return (
              <Pressable
                onPress={() => handleSelect(item)}
                style={[styles.resultRow, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              >
                <View style={[styles.resultIcon, { backgroundColor: isTask ? BRAND.orange08 : BRAND.teal08 }]}>
                  <Icon name={isTask ? 'FileText' : 'FolderKanban'} size={13} color={isTask ? BRAND.orange : BRAND.teal} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13.5, fontFamily: FONT.inter.semibold, color: colors.text }}>
                    {item.title ?? item.name}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: FONT.inter.regular, color: colors.textMuted, marginTop: 1 }}>
                    {isTask ? `Tâche${item.projectName ? ` · ${item.projectName}` : ''}` : 'Projet'}
                  </Text>
                </View>
                {prio && <Icon name="Flag" size={11} color={prio.iconColor} />}
                <Icon name="ChevronRight" size={13} color={colors.textMuted} />
              </Pressable>
            );
          }}
        />
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1.5,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 13,
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: FONT.inter.medium,
    paddingVertical: 0,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12.5,
    fontFamily: FONT.inter.regular,
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 11,
  },
  resultIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

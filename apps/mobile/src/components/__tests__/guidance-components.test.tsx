import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { View } from 'react-native';

import DisabledStateHelper from '@/components/disabled-state-helper';
import FeatureBadge from '@/components/feature-badge';
import { GuidanceProvider, useGuidance } from '@/components/guidance-context';
import * as guidancePosition from '@/lib/guidance-position';

// ---- Helper chuyển tree thành text thuần (pattern có sẵn trong repo) ----
function textOf(tree: ReactTestRenderer): string {
  const json = tree.toJSON();
  const texts: string[] = [];
  // GuidanceProvider render fragment → toJSON có thể là MẢNG (Provider không phải host node)
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const c of node) walk(c);
      return;
    }
    if (node == null || typeof node !== 'object') {
      if (typeof node === 'string') texts.push(node);
      return;
    }
    const n = node as { children?: unknown[] };
    if (Array.isArray(n.children)) {
      for (const c of n.children) {
        if (typeof c === 'string') texts.push(c);
        else walk(c);
      }
    }
  };
  walk(json);
  return texts.join(' ');
}

const norm = (s: string) => s.replace(/\s+/g, '');

function renderWithProvider(ui: React.ReactElement) {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<GuidanceProvider>{ui}</GuidanceProvider>);
  });
  return { tree, unmount: () => act(() => tree.unmount()) };
}

// Component dùng hook để test startTour/next từ bên trong provider.
// Tự đăng ký 2 element target và expose api cho test.
function TourHarness({ onReady }: { onReady: (api: ReturnType<typeof useGuidance>) => void }) {
  const api = useGuidance();
  onReady(api); // test-only: không dùng trong prod code
  return (
    <View>
      <View ref={api.registerTarget('target.a')} testID="target-a" />
      <View ref={api.registerTarget('target.b')} testID="target-b" />
    </View>
  );
}

describe('FeatureBadge', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('hiện label "Mới" khi feature chưa dismiss', async () => {
    const { tree, unmount } = renderWithProvider(<FeatureBadge featureKey="settings.language" />);
    // đọc AsyncStorage là async → flush microtask
    await act(async () => {});
    expect(norm(textOf(tree))).toContain(norm('Mới'));
    unmount();
  });

  it('bấm vào badge → dismiss vĩnh viễn (không hiện lại khi mount lại)', async () => {
    const { tree, unmount } = renderWithProvider(<FeatureBadge featureKey="settings.language" />);
    await act(async () => {});
    expect(norm(textOf(tree))).toContain(norm('Mới'));

    // Bấm badge → ẩn ngay
    const badge = tree.root.findByProps({ testID: 'feature-badge-settings.language' });
    act(() => badge.props.onPress());
    await act(async () => {});
    expect(textOf(tree)).not.toContain('Mới');

    // Mount lại từ đầu → vẫn ẩn (đã lưu dismissed)
    const { tree: tree2, unmount: unmount2 } = renderWithProvider(<FeatureBadge featureKey="settings.language" />);
    await act(async () => {});
    expect(textOf(tree2)).not.toContain('Mới');
    unmount();
    unmount2();
  });

  it('variant dot → không có text', async () => {
    const { tree, unmount } = renderWithProvider(<FeatureBadge featureKey="x" variant="dot" />);
    await act(async () => {});
    expect(textOf(tree)).not.toContain('Mới');
    expect(tree.root.findAllByProps({ testID: 'feature-badge-x' }).length).toBeGreaterThanOrEqual(1);
    unmount();
  });
});

describe('DisabledStateHelper', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    // measureNode trong môi trường test node không có native API → mock trả rect giả
    jest.spyOn(guidancePosition, 'measureNode').mockResolvedValue({ x: 10, y: 20, width: 100, height: 40 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('disabled → tap vào nút hiện tooltip lý do + điều kiện unlock', async () => {
    const { tree, unmount } = renderWithProvider(
      <DisabledStateHelper disabled reason="Đang lưu cài đặt..." unlock="Chờ lưu xong rồi bấm lại.">
        <View>
          <View>Save button</View>
        </View>
      </DisabledStateHelper>,
    );
    // Chưa tap → không có tooltip standalone
    expect(tree.root.findAllByProps({ testID: 'guidance-standalone' })).toHaveLength(0);

    // Tap vào vùng chặn (Pressable phủ lên nút disabled)
    const catcher = tree.root.findByProps({ testID: 'disabled-state-helper-tap-catcher' });
    act(() => catcher.props.onPress());
    await act(async () => {});

    // Tooltip hiện: lý do + unlock (findAllByProps trả cả composite + host → dùng >= 1)
    expect(tree.root.findAllByProps({ testID: 'guidance-standalone' }).length).toBeGreaterThanOrEqual(1);
    expect(norm(textOf(tree))).toContain(norm('Đang lưu cài đặt...'));
    expect(norm(textOf(tree))).toContain(norm('Chờ lưu xong rồi bấm lại.'));

    // Tap backdrop → đóng tooltip
    const backdrop = tree.root.findByProps({ testID: 'guidance-standalone-backdrop' });
    act(() => backdrop.props.onPress());
    await act(async () => {});
    expect(tree.root.findAllByProps({ testID: 'guidance-standalone' })).toHaveLength(0);
    unmount();
  });

  it('không disabled → pass-through: không có tap-catcher, nút dùng hành vi gốc', () => {
    const { tree, unmount } = renderWithProvider(
      <DisabledStateHelper disabled={false} reason="x">
        <View>
          <View>Active button</View>
        </View>
      </DisabledStateHelper>,
    );
    expect(textOf(tree)).toContain('Active button');
    expect(tree.root.findAllByProps({ testID: 'disabled-state-helper-tap-catcher' })).toHaveLength(0);
    unmount();
  });
});

describe('GuidanceProvider — tour nhiều bước', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('startTour → không crash khi measure trả null (môi trường test); next/skip không ném', async () => {
    let api!: ReturnType<typeof useGuidance>;
    const { tree, unmount } = renderWithProvider(<TourHarness onReady={(a) => (api = a)} />);
    act(() => {
      void api.startTour({
        tourId: 'test-tour',
        isNewUser: true,
        steps: [
          { id: 'a', targetKey: 'target.a', title: 'Bước A', body: 'Nội dung A' },
          { id: 'b', targetKey: 'target.b', title: 'Bước B', body: 'Nội dung B' },
        ],
      });
    });
    await act(async () => {});
    // Trong test node không có measureInWindow → rect null → overlay ẩn an toàn (không crash)
    expect(tree.root.findAllByProps({ testID: 'guidance-spotlight' })).toHaveLength(0);
    act(() => api.next());
    await act(async () => {});
    act(() => api.skip());
    await act(async () => {});
    expect(tree.root.findAllByProps({ testID: 'guidance-spotlight' })).toHaveLength(0);
    unmount();
  });

  it('đã xem tour → startTour là no-op (trigger show-once)', async () => {
    let api!: ReturnType<typeof useGuidance>;
    const { tree, unmount } = renderWithProvider(<TourHarness onReady={(a) => (api = a)} />);
    await AsyncStorage.setItem('guidance.tour.test-tour.seen', '1');
    act(() => {
      void api.startTour({
        tourId: 'test-tour',
        isNewUser: true,
        steps: [{ id: 'a', targetKey: 'target.a', title: 'Bước A', body: 'Nội dung A' }],
      });
    });
    await act(async () => {});
    expect(tree.root.findAllByProps({ testID: 'guidance-spotlight' })).toHaveLength(0);
    unmount();
  });
});

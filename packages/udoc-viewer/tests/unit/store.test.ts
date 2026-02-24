import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore, type Reducer, type Subscriber, type Store } from '../../src/ui/framework/store.js';

interface TestState {
  count: number;
  name: string;
}

type TestAction = { type: 'INCREMENT' } | { type: 'DECREMENT' } | { type: 'SET_NAME'; name: string };

const testReducer: Reducer<TestState, TestAction> = (state, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    case 'SET_NAME':
      return { ...state, name: action.name };
    default:
      return state;
  }
};

const initialState: TestState = { count: 0, name: 'test' };

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('createStore', () => {
  let store: Store<TestState, TestAction>;

  beforeEach(() => {
    store = createStore(testReducer, initialState);
  });

  describe('getState', () => {
    it('should return the initial state', () => {
      expect(store.getState()).toEqual(initialState);
    });

    it('should return the current state after dispatches', async () => {
      store.dispatch({ type: 'INCREMENT' });
      await flushMicrotasks();
      expect(store.getState().count).toBe(1);
    });
  });

  describe('dispatch', () => {
    it('should update state via reducer', async () => {
      store.dispatch({ type: 'INCREMENT' });
      await flushMicrotasks();
      expect(store.getState().count).toBe(1);
    });

    it('should not update state when reducer returns same reference', async () => {
      const subscriber = vi.fn();
      store.subscribeRender(subscriber);
      
      store.dispatch({ type: 'UNKNOWN' } as TestAction);
      await flushMicrotasks();
      
      expect(subscriber).not.toHaveBeenCalled();
    });

    it('should handle multiple dispatches', async () => {
      store.dispatch({ type: 'INCREMENT' });
      store.dispatch({ type: 'INCREMENT' });
      store.dispatch({ type: 'DECREMENT' });
      await flushMicrotasks();
      
      expect(store.getState().count).toBe(1);
    });
  });

  describe('subscribeRender', () => {
    it('should call subscriber after dispatch', async () => {
      const subscriber = vi.fn();
      store.subscribeRender(subscriber);
      
      store.dispatch({ type: 'INCREMENT' });
      await flushMicrotasks();
      
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('should receive previous and next state', async () => {
      const subscriber: Subscriber<TestState> = vi.fn();
      store.subscribeRender(subscriber);
      
      store.dispatch({ type: 'INCREMENT' });
      await flushMicrotasks();
      
      expect(subscriber).toHaveBeenCalledWith(
        { count: 0, name: 'test' },
        { count: 1, name: 'test' }
      );
    });

    it('should return unsubscribe function', async () => {
      const subscriber = vi.fn();
      const unsubscribe = store.subscribeRender(subscriber);
      
      store.dispatch({ type: 'INCREMENT' });
      await flushMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      
      store.dispatch({ type: 'INCREMENT' });
      await flushMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('should support multiple subscribers', async () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();
      
      store.subscribeRender(subscriber1);
      store.subscribeRender(subscriber2);
      
      store.dispatch({ type: 'INCREMENT' });
      await flushMicrotasks();
      
      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribeEffect', () => {
    it('should call effect subscriber after render subscribers', async () => {
      const renderSubscriber = vi.fn();
      const effectSubscriber = vi.fn();
      
      store.subscribeRender(renderSubscriber);
      store.subscribeEffect(effectSubscriber);
      
      store.dispatch({ type: 'INCREMENT' });
      await flushMicrotasks();
      
      expect(renderSubscriber).toHaveBeenCalled();
      expect(effectSubscriber).toHaveBeenCalled();
    });

    it('should return unsubscribe function', async () => {
      const subscriber = vi.fn();
      const unsubscribe = store.subscribeEffect(subscriber);
      
      store.dispatch({ type: 'INCREMENT' });
      await flushMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      
      store.dispatch({ type: 'INCREMENT' });
      await flushMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe('batching', () => {
    it('should batch multiple dispatches into single notification', async () => {
      const subscriber = vi.fn();
      store.subscribeRender(subscriber);
      
      store.dispatch({ type: 'INCREMENT' });
      store.dispatch({ type: 'INCREMENT' });
      store.dispatch({ type: 'INCREMENT' });
      
      expect(subscriber).not.toHaveBeenCalled();
      
      await flushMicrotasks();
      
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith(
        { count: 0, name: 'test' },
        { count: 3, name: 'test' }
      );
    });

    it('should use first prev state and last next state in batch', async () => {
      const subscriber: Subscriber<TestState> = vi.fn();
      store.subscribeRender(subscriber);
      
      store.dispatch({ type: 'INCREMENT' });
      store.dispatch({ type: 'SET_NAME', name: 'updated' });
      
      await flushMicrotasks();
      
      expect(subscriber).toHaveBeenCalledWith(
        { count: 0, name: 'test' },
        { count: 1, name: 'updated' }
      );
    });

    it('should not batch when batching is disabled', () => {
      const unbatchedStore = createStore(testReducer, initialState, { batched: false });
      const subscriber = vi.fn();
      unbatchedStore.subscribeRender(subscriber);
      
      unbatchedStore.dispatch({ type: 'INCREMENT' });
      unbatchedStore.dispatch({ type: 'INCREMENT' });
      
      expect(subscriber).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should catch errors in render subscribers and continue', async () => {
      const errorSubscriber = vi.fn(() => {
        throw new Error('Render error');
      });
      const normalSubscriber = vi.fn();
      
      store.subscribeRender(errorSubscriber);
      store.subscribeRender(normalSubscriber);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      store.dispatch({ type: 'INCREMENT' });
      await flushMicrotasks();
      
      expect(normalSubscriber).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Render subscriber error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should catch errors in effect subscribers and continue', async () => {
      const errorEffect = vi.fn(() => {
        throw new Error('Effect error');
      });
      const normalEffect = vi.fn();
      
      store.subscribeEffect(errorEffect);
      store.subscribeEffect(normalEffect);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      store.dispatch({ type: 'INCREMENT' });
      await flushMicrotasks();
      
      expect(normalEffect).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Effect subscriber error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('subscriber order', () => {
    it('should call render subscribers before effect subscribers', async () => {
      const order: string[] = [];
      
      store.subscribeRender(() => order.push('render1'));
      store.subscribeRender(() => order.push('render2'));
      store.subscribeEffect(() => order.push('effect1'));
      store.subscribeEffect(() => order.push('effect2'));
      
      store.dispatch({ type: 'INCREMENT' });
      await flushMicrotasks();
      
      expect(order).toEqual(['render1', 'render2', 'effect1', 'effect2']);
    });
  });
});

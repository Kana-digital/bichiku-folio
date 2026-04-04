import { useState, useCallback } from 'react';
import { StockItem } from '../types';

/**
 * 在庫アイテムのCRUD操作を管理するカスタムフック
 */
export function useItemActions(
  items: StockItem[],
  saveItems: (items: StockItem[]) => void
) {
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [consumeModalVisible, setConsumeModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);

  const handleAddSubmit = useCallback(
    (
      name: string,
      sec: string,
      qty: number,
      kcal: number,
      waterL: number,
      expiry: string,
      loc: string
    ) => {
      const newItem: StockItem = {
        id: Date.now(),
        name,
        sec,
        qty,
        kcal,
        waterL,
        expiry,
        loc,
      };
      saveItems([...items, newItem]);
      setAddModalVisible(false);
    },
    [items, saveItems]
  );

  const handleConsume = useCallback(
    (id: number, qty: number) => {
      const newItems = items
        .map((i) => {
          if (i.id !== id) return i;
          const newQty = i.qty - qty;
          return newQty <= 0 ? null : { ...i, qty: newQty };
        })
        .filter((i): i is StockItem => i !== null);
      saveItems(newItems);
      setConsumeModalVisible(false);
    },
    [items, saveItems]
  );

  const handleEditSave = useCallback(
    (updated: StockItem) => {
      saveItems(items.map((i) => (i.id === updated.id ? updated : i)));
      setEditItem(null);
    },
    [items, saveItems]
  );

  const handleEditDelete = useCallback(
    (id: number) => {
      saveItems(items.filter((i) => i.id !== id));
      setEditItem(null);
    },
    [items, saveItems]
  );

  return {
    addModalVisible,
    setAddModalVisible,
    consumeModalVisible,
    setConsumeModalVisible,
    editItem,
    setEditItem,
    handleAddSubmit,
    handleConsume,
    handleEditSave,
    handleEditDelete,
  };
}

export class Store {
    constructor() {
        this.STORAGE_KEYS = {
            benzine: 'inventory_benzine',
            jadid: 'inventory_jadid',
            haj: 'inventory_haj',
            outgoing: 'outgoings_history'
        };
    }

    getItems(warehouse) {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS[warehouse]);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    }

    saveItems(warehouse, items) {
        localStorage.setItem(this.STORAGE_KEYS[warehouse], JSON.stringify(items));
    }

    addItem(warehouse, item) {
        const items = this.getItems(warehouse);
        item.id = Date.now();
        item.initialMeters = parseFloat(item.initialMeters);
        item.remainingMeters = parseFloat(item.remainingMeters);
        items.push(item);
        this.saveItems(warehouse, items);
        return item;
    }

    updateItem(warehouse, updatedItem) {
        const items = this.getItems(warehouse);
        const index = items.findIndex(i => i.id == updatedItem.id);
        if (index !== -1) {
            items[index] = { ...items[index], ...updatedItem, 
                initialMeters: parseFloat(updatedItem.initialMeters),
                remainingMeters: parseFloat(updatedItem.remainingMeters) 
            };
            this.saveItems(warehouse, items);
        }
    }

    deleteItem(warehouse, id) {
        let items = this.getItems(warehouse);
        items = items.filter(i => i.id != id);
        this.saveItems(warehouse, items);
    }

    getItem(warehouse, id) {
        return this.getItems(warehouse).find(i => i.id == id);
    }

    addOutgoing(trx) {
        const items = this.getItems(trx.warehouse);
        const itemIndex = items.findIndex(i => i.id == trx.itemId);
        
        if (itemIndex === -1) throw new Error("العنصر غير موجود");
        
        const currentItem = items[itemIndex];
        const currentMeters = parseFloat(currentItem.remainingMeters);
        const outMeters = parseFloat(trx.metersOut);

        if (currentMeters < outMeters) {
            throw new Error(`الرصيد غير كافٍ. المتاح: ${currentMeters}`);
        }

        currentItem.remainingMeters = Math.round((currentMeters - outMeters) * 100) / 100;
        items[itemIndex] = currentItem;
        this.saveItems(trx.warehouse, items);

        const history = this.getOutgoings();
        trx.id = Date.now();
        trx.itemName = currentItem.type;
        trx.itemSize = currentItem.size;
        history.push(trx);
        localStorage.setItem(this.STORAGE_KEYS.outgoing, JSON.stringify(history));
    }

    getOutgoings() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.outgoing);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    }

    deleteOutgoing(id) {
        let history = this.getOutgoings();
        const trx = history.find(h => h.id == id);
        
        if (trx) {
            const items = this.getItems(trx.warehouse);
            const itemIndex = items.findIndex(i => i.id == trx.itemId);
            
            if (itemIndex !== -1) {
                const current = parseFloat(items[itemIndex].remainingMeters);
                const refund = parseFloat(trx.metersOut);
                items[itemIndex].remainingMeters = Math.round((current + refund) * 100) / 100;
                this.saveItems(trx.warehouse, items);
            } else {
                throw new Error("لا يمكن استرجاع الكمية: الصنف الأصلي محذوف.");
            }
        }
        history = history.filter(h => h.id != id);
        localStorage.setItem(this.STORAGE_KEYS.outgoing, JSON.stringify(history));
    }

    clearHistoryBefore(dateStr) {
        let history = this.getOutgoings();
        const initialCount = history.length;
        history = history.filter(h => h.date >= dateStr);
        localStorage.setItem(this.STORAGE_KEYS.outgoing, JSON.stringify(history));
        return initialCount - history.length;
    }
}

import { Store } from './data.js';
import { UI } from './ui.js';

const store = new Store();
const ui = new UI(store);
let currentModalMode = 'add';

const debounce = (fn, delay) => {
    let id;
    return (...args) => {
        clearTimeout(id);
        id = setTimeout(() => fn(...args), delay);
    };
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('outDate').valueAsDate = new Date();
    ['benzine', 'jadid', 'haj'].forEach(wh => ui.renderInventory(wh));
    ui.renderOutgoingTable();
});


document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`view-${btn.dataset.tab}`).classList.add('active');
        document.getElementById('navLinks').classList.remove('active');
    });
});
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('active');
});


document.querySelectorAll('.search-input').forEach(input => {
    input.addEventListener('keyup', debounce((e) => {
        const term = e.target.value.toLowerCase().replace(/[أإآ]/g, 'ا');
        const rows = document.querySelectorAll(`#${e.target.dataset.target} tbody tr`);
        rows.forEach(row => {
            const text = row.textContent.toLowerCase().replace(/[أإآ]/g, 'ا');
            row.style.display = text.includes(term) ? '' : 'none';
        });
    }, 300));
});


['benzine', 'jadid', 'haj'].forEach(wh => {
    const addBtn = document.querySelector(`.add-btn[data-warehouse="${wh}"]`);
    if(addBtn) addBtn.addEventListener('click', () => openModal(wh));

    const exportBtn = document.querySelector(`.export-btn[data-warehouse="${wh}"]`);
    if(exportBtn) exportBtn.addEventListener('click', () => {
        const items = store.getItems(wh);
        const data = [['النوع', 'المقاس', 'أولي', 'متبقي'], ...items.map(i => [i.type, i.size, i.initialMeters, i.remainingMeters])];
        ui.exportToCSV(`inventory_${wh}.csv`, data);
    });

    document.getElementById(`table-${wh}`).addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        if (btn.classList.contains('del-btn')) {
            if(confirm('هل أنت متأكد من الحذف؟')) {
                store.deleteItem(wh, btn.dataset.id);
                ui.renderInventory(wh);
                ui.showToast('تم الحذف');
            }
        } else if (btn.classList.contains('edit-btn')) {
            openModal(wh, store.getItem(wh, btn.dataset.id));
        }
    });
});


const modal = document.getElementById('itemModal');
const itemForm = document.getElementById('itemForm');
function openModal(wh, item = null) {
    document.getElementById('itemWarehouse').value = wh;
    if (item) {
        currentModalMode = 'edit';
        document.getElementById('modalTitle').textContent = 'تعديل عنصر';
        document.getElementById('itemId').value = item.id;
        document.getElementById('itemType').value = item.type;
        document.getElementById('itemSize').value = item.size;
        document.getElementById('itemMeters').value = item.remainingMeters;
        document.getElementById('labelMeters').textContent = 'تعديل الرصيد الفعلي';
        document.getElementById('helpMeters').textContent = 'تحذير: تعديل هذا الرقم يغير المخزون مباشرة';
    } else {
        currentModalMode = 'add';
        document.getElementById('modalTitle').textContent = 'إضافة عنصر';
        itemForm.reset();
        document.getElementById('itemType').value = 'ألومنيوم';
        document.getElementById('labelMeters').textContent = 'عدد الأمتار';
        document.getElementById('helpMeters').textContent = 'رصيد افتتاحي';
    }
    modal.classList.add('show');
}
const closeModal = () => modal.classList.remove('show');
document.querySelectorAll('.close-modal, .close-modal-btn').forEach(b => b.addEventListener('click', closeModal));

itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const wh = document.getElementById('itemWarehouse').value;
    const type = document.getElementById('itemType').value;
    const size = document.getElementById('itemSize').value;
    const meters = parseFloat(document.getElementById('itemMeters').value);
    
    if (meters < 0) return ui.showToast('لا يمكن أن تكون الأمتار سالبة', true);

    const item = { type, size, remainingMeters: meters };
    if (currentModalMode === 'add') {
        item.initialMeters = meters;
        store.addItem(wh, item);
        ui.showToast('تمت الإضافة');
    } else {
        item.id = document.getElementById('itemId').value;
        const original = store.getItem(wh, item.id);
        item.initialMeters = original.initialMeters;
        store.updateItem(wh, item);
        ui.showToast('تم التعديل');
    }
    ui.renderInventory(wh);
    closeModal();
});


document.getElementById('outWarehouse').addEventListener('change', (e) => ui.populateOutgoingItemSelect(e.target.value));
document.getElementById('outgoingForm').addEventListener('submit', (e) => {
    e.preventDefault();
    try {
        const wh = document.getElementById('outWarehouse').value;
        const trx = {
            warehouse: wh,
            date: document.getElementById('outDate').value,
            recipient: document.getElementById('outRecipient').value,
            itemId: document.getElementById('outItem').value,
            metersOut: parseFloat(document.getElementById('outMeters').value)
        };
        if(!trx.itemId) throw new Error('اختر العنصر');
        if(trx.metersOut <= 0) throw new Error('الكمية يجب أن تكون أكبر من 0');

        store.addOutgoing(trx);
        ui.showToast('تم الإصدار');
        e.target.reset();
        document.getElementById('outDate').valueAsDate = new Date();
        ui.populateOutgoingItemSelect(wh);
        ui.renderInventory(wh);
        ui.renderOutgoingTable();
    } catch(err) { ui.showToast(err.message, true); }
});


document.getElementById('table-outgoing').addEventListener('click', (e) => {
    const btn = e.target.closest('.del-hist-btn');
    if(btn && confirm('حذف السجل واسترجاع الكمية؟')) {
        try {
            store.deleteOutgoing(btn.dataset.id);
            ['benzine', 'jadid', 'haj'].forEach(wh => ui.renderInventory(wh));
            ui.renderOutgoingTable();
            ui.showToast('تم الاسترجاع');
        } catch(err) { ui.showToast(err.message, true); }
    }
});


document.getElementById('btnFilterDate').addEventListener('click', () => {
    ui.renderOutgoingTable(document.getElementById('filterDate').value);
    ui.showToast('تم الفلترة');
});
document.getElementById('btnResetFilter').addEventListener('click', () => {
    document.getElementById('filterDate').value = '';
    ui.renderOutgoingTable();
});
document.getElementById('btnExportOutgoing').addEventListener('click', () => {
    const data = [['التاريخ', 'المخزن', 'المستلم', 'النوع', 'المقاس', 'أمتار'], ...store.getOutgoings().map(h => [h.date, h.warehouse, h.recipient, h.itemName, h.itemSize, h.metersOut])];
    ui.exportToCSV('outgoing_report.csv', data);
});
document.getElementById('btnClearHistory').addEventListener('click', () => {
    const date = document.getElementById('clearDate').value;
    if(!date) return ui.showToast('اختر التاريخ', true);
    if(confirm('حذف السجلات القديمة نهائياً؟')) {
        const count = store.clearHistoryBefore(date);
        ui.renderOutgoingTable();
        ui.showToast(`تم حذف ${count} سجل`);
    }
});


document.querySelectorAll('.print-btn, #btnPrintOutgoing').forEach(btn => {
    btn.addEventListener('click', () => {
        if(confirm('هل تريد طباعة التقرير الحالي؟')) {
            const activeId = document.querySelector('.view.active').id;
            const titles = {
                'view-benzine': 'جرد: مخزن بنزينه',
                'view-jadid': 'جرد: مخزن جديد',
                'view-haj': 'جرد: مخزن الحج',
                'view-outgoing': 'تقرير الإصدارات'
            };
            ui.updatePrintHeader(titles[activeId] || 'تقرير');
            window.print();
        }
    });
});

export class UI {
    constructor(store) {
        this.store = store;
        this.warehouseNames = { 'benzine': 'مخزن بنزينه', 'jadid': 'مخزن جديد', 'haj': 'مخزن الحج' };
    }

    showToast(msg, isError = false) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.style.background = isError ? '#c0392b' : '#27ae60';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    updatePrintHeader(title) {
        const now = new Date();
        document.getElementById('printTitle').textContent = title;
        document.getElementById('printDateStr').textContent = 'تاريخ الطباعة: ' + now.toLocaleDateString('ar-EG') + ' ' + now.toLocaleTimeString('ar-EG');
    }

    createEl(tag, text = '', className = '') {
        const el = document.createElement(tag);
        if (text) el.textContent = text;
        if (className) el.className = className;
        return el;
    }

    renderInventory(wh) {
        const items = this.store.getItems(wh);
        const tbody = document.querySelector(`#table-${wh} tbody`);
        const totalEl = document.getElementById(`total-${wh}`);
        
        tbody.innerHTML = ''; 
        let total = 0;

        if (items.length === 0) {
            const tr = this.createEl('tr');
            const td = this.createEl('td', 'لا توجد عناصر');
            td.colSpan = 5; td.style.textAlign = 'center'; td.style.color = '#7f8c8d';
            tr.appendChild(td);
            tbody.appendChild(tr);
        } else {
            items.forEach(item => {
                total += parseFloat(item.remainingMeters);
                const tr = document.createElement('tr');
                tr.appendChild(this.createEl('td', item.type));
                tr.appendChild(this.createEl('td', item.size));
                tr.appendChild(this.createEl('td', item.initialMeters));
                
                const tdRem = this.createEl('td', item.remainingMeters);
                tdRem.style.fontWeight = 'bold';
                tr.appendChild(tdRem);

                const tdAct = document.createElement('td');
                tdAct.className = 'no-print';
                
                const btnEdit = this.createEl('button', '✏️', 'action-btn edit-btn');
                btnEdit.dataset.id = item.id;
                btnEdit.dataset.wh = wh;
                
                const btnDel = this.createEl('button', '🗑️', 'action-btn del-btn');
                btnDel.dataset.id = item.id;
                btnDel.dataset.wh = wh;
                
                tdAct.appendChild(btnEdit);
                tdAct.appendChild(btnDel);
                tr.appendChild(tdAct);
                tbody.appendChild(tr);
            });
        }
        totalEl.textContent = total.toFixed(1) + ' م';
    }

    populateOutgoingItemSelect(wh) {
        const select = document.getElementById('outItem');
        select.innerHTML = '';
        select.appendChild(this.createEl('option', 'اختر العنصر'));
        select.options[0].disabled = true;
        select.options[0].selected = true;
        select.disabled = false;

        if (!wh) {
            select.innerHTML = '';
            select.appendChild(this.createEl('option', 'اختر المخزن أولاً'));
            select.disabled = true;
            return;
        }

        const items = this.store.getItems(wh);
        if(items.length === 0) {
            select.innerHTML = '';
            select.appendChild(this.createEl('option', 'المخزن فارغ'));
            select.disabled = true;
            return;
        }

        let count = 0;
        items.forEach(item => {
            if (item.remainingMeters > 0) {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = `${item.type} | ${item.size} (المتاح: ${item.remainingMeters})`;
                select.appendChild(opt);
                count++;
            }
        });

        if (count === 0) {
            select.innerHTML = '';
            select.appendChild(this.createEl('option', 'نفذت الكميات'));
            select.disabled = true;
        }
    }

    renderOutgoingTable(filterDate = null) {
        let history = this.store.getOutgoings();
        history.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
        if (filterDate) history = history.filter(h => h.date === filterDate);

        const tbody = document.querySelector('#table-outgoing tbody');
        const totalEl = document.getElementById('total-outgoing-meters');
        tbody.innerHTML = '';
        let total = 0;

        if (history.length === 0) {
            const tr = this.createEl('tr');
            const td = this.createEl('td', 'لا توجد سجلات');
            td.colSpan = 7; td.style.textAlign = 'center';
            tr.appendChild(td);
            tbody.appendChild(tr);
        } else {
            history.forEach(h => {
                total += parseFloat(h.metersOut);
                const tr = document.createElement('tr');
                tr.appendChild(this.createEl('td', h.date));
                tr.appendChild(this.createEl('td', this.warehouseNames[h.warehouse] || h.warehouse));
                tr.appendChild(this.createEl('td', h.recipient));
                tr.appendChild(this.createEl('td', h.itemName));
                tr.appendChild(this.createEl('td', h.itemSize));
                tr.appendChild(this.createEl('td', h.metersOut));

                const tdAct = document.createElement('td');
                tdAct.className = 'no-print';
                const btnDel = this.createEl('button', '🗑️', 'action-btn del-hist-btn');
                btnDel.dataset.id = h.id;
                btnDel.title = 'حذف واسترجاع الكمية';
                tdAct.appendChild(btnDel);
                
                tr.appendChild(tdAct);
                tbody.appendChild(tr);
            });
        }
        totalEl.textContent = total.toFixed(1);
    }

    exportToCSV(filename, rows) {
        const processRow = (row) => row.map(val => {
            const str = (val === null ? '' : val.toString()).replace(/"/g, '""');
            return /[",\n]/.test(str) ? `"${str}"` : str;
        }).join(',');
        
        const csvContent = '\uFEFF' + rows.map(processRow).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
}

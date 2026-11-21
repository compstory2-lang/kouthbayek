window.APP_EMERGENCY = (() => {
  let pickerMap = null;
  let pickerMarker = null;
  let pickedCoords = { lat: 33.8815, lng: 10.0982 };

  function updateCoordsLabel() {
    const el = document.getElementById('emCoordsText');
    if (el) {
      el.textContent = `الإحداثيات: ${pickedCoords.lat.toFixed(4)}, ${pickedCoords.lng.toFixed(4)}`;
    }
  }

  function initOrMovePickerMap(lat, lng) {
    pickedCoords = { lat, lng };
    updateCoordsLabel();

    if (!window.L) return;

    if (!pickerMap) {
      pickerMap = L.map('emPickerMap').setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(pickerMap);

      pickerMarker = L.marker([lat, lng], { draggable: true }).addTo(pickerMap);
      pickerMarker.on('dragend', () => {
        const pos = pickerMarker.getLatLng();
        pickedCoords = { lat: pos.lat, lng: pos.lng };
        updateCoordsLabel();
      });

      pickerMap.on('click', (e) => {
        pickedCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
        pickerMarker.setLatLng([pickedCoords.lat, pickedCoords.lng]);
        updateCoordsLabel();
      });
    } else {
      pickerMap.setView([lat, lng], 13);
      pickerMarker.setLatLng([lat, lng]);
    }

    setTimeout(() => {
      pickerMap?.invalidateSize();
    }, 150);
  }

  function openModal(currentLoc, activeGov) {
    const modal = document.getElementById('emergencyModal');
    const govSelect = document.getElementById('emGov');
    if (govSelect && govSelect.options.length === 0) {
      (window.APP_CONFIG?.governorates || []).forEach((g) => {
        const opt = document.createElement('option');
        opt.value = g.name;
        opt.textContent = g.name;
        govSelect.appendChild(opt);
      });
    }
    if (govSelect && activeGov) {
      govSelect.value = activeGov;
    }

    const startLat = currentLoc?.lat ?? window.APP_CONFIG.defaultLocation.lat;
    const startLng = currentLoc?.lng ?? window.APP_CONFIG.defaultLocation.lng;

    modal.classList.remove('hidden');
    initOrMovePickerMap(startLat, startLng);
  }

  function closeModal() {
    document.getElementById('emergencyModal')?.classList.add('hidden');
  }

  async function submitForm(e, onSuccess) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitEmergency');
    const category = document.getElementById('emCategory').value;
    const governorate = document.getElementById('emGov').value;
    const description = document.getElementById('emDesc').value.trim();
    const rawPhone = document.getElementById('emPhone').value.trim();

    if (!description) {
      alert('يرجى كتابة وصف مختصر للحالة الطارئة');
      return;
    }

    let phone = null;
    if (rawPhone) {
      if (!/^[2459]\d{7}$/.test(rawPhone)) {
        alert('رقم الهاتف يجب أن يكون 8 أرقام تونسية صحيحة');
        return;
      }
      phone = rawPhone;
    }

    btn.disabled = true;
    btn.textContent = 'جاري النشر...';

    try {
      await window.APP_STORAGE.createEmergency({
        category,
        governorate,
        description,
        phone,
        lat: pickedCoords.lat,
        lng: pickedCoords.lng
      });
      document.getElementById('emergencyForm').reset();
      closeModal();
      if (typeof onSuccess === 'function') {
        await onSuccess();
      }
      alert('تم نشر بلاغ الطوارئ بنجاح');
    } catch (err) {
      alert('تعذر نشر البلاغ: ' + (err.message || 'خطأ غير متوقع'));
    } finally {
      btn.disabled = false;
      btn.textContent = '🚨 نشر البلاغ فوراً';
    }
  }

  return {
    openModal,
    closeModal,
    submitForm
  };
})();

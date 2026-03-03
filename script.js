let recipes = [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let cartItems = []; 

const listContainer = document.getElementById('recipe-list');
const searchInput = document.getElementById('searchIngredient');
const sortSelect = document.getElementById('sortName');
const diffSelect = document.getElementById('filterDifficulty');
const timeInput = document.getElementById('filterTime');
const timeValueDisplay = document.getElementById('timeValue');
const favCheckbox = document.getElementById('filterFav');

async function loadData() {
    try {
        const response = await fetch('data.json');
        recipes = await response.json();
        applyFilters(); 
    } catch (error) {
        listContainer.innerHTML = '<p style="color: red; text-align: center;">Không thể kết nối CSDL!</p>';
    }
}
loadData();

function renderRecipes(data) {
    document.getElementById('recipeCountDisplay').innerHTML = `📜 Tìm thấy: <strong>${data.length}</strong> công thức`;
    listContainer.innerHTML = ''; 
    if(data.length === 0) {
        listContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #777;">Không tìm thấy món.</p>';
        return;
    }

    data.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => openModal(recipe);
        const isFav = favorites.includes(recipe.id);
        
        card.innerHTML = `
            <div class="heart-btn" onclick="toggleFavorite(event, ${recipe.id})">${isFav ? '❤️' : '🤍'}</div>
            <img class="card-image" src="${recipe.image}" alt="">
            <div class="card-content">
                <h3>${recipe.name}</h3>
                <p>⏱ ${recipe.time} phút | ${'⭐'.repeat(recipe.difficulty)}</p>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

function applyFilters() {
    const keyword = searchInput.value.toLowerCase();
    const maxTime = parseInt(timeInput.value);
    const difficulty = diffSelect.value;
    const showFavOnly = favCheckbox.checked;

    let filteredData = recipes.filter(r => {
        const matchKeyword = r.name.toLowerCase().includes(keyword) || r.ingredients.some(ing => ing.toLowerCase().includes(keyword));
        const matchTime = r.time <= maxTime;
        const matchDiff = difficulty === "" || r.difficulty == difficulty;
        const matchFav = !showFavOnly || favorites.includes(r.id);
        return matchKeyword && matchTime && matchDiff && matchFav;
    });

    filteredData.sort((a, b) => sortSelect.value === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    renderRecipes(filteredData);
}

function toggleFavorite(event, recipeId) {
    event.stopPropagation();
    if (favorites.includes(recipeId)) favorites = favorites.filter(id => id !== recipeId);
    else favorites.push(recipeId);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    applyFilters();
}

let currentRecipe = null;
function openModal(recipe) {
    document.body.style.overflow = 'hidden';
    currentRecipe = recipe;
    document.getElementById('modalTitle').innerText = recipe.name;
    document.getElementById('modalMetaInfo').innerHTML = `⏱ ${recipe.time} phút &nbsp;&nbsp;|&nbsp;&nbsp; ${'⭐'.repeat(recipe.difficulty)}`;
    document.getElementById('modalImage').src = recipe.image;
    document.getElementById('portionCount').value = 4;
    renderIngredients(4);
    document.getElementById('modalInstructions').innerHTML = `<ol class="instruction-list">${recipe.instructions.map(step => `<li>${step}</li>`).join('')}</ol>`;
    document.getElementById('recipeModal').style.display = 'block';
}

function renderIngredients(portions) {
    if (!currentRecipe) return;
    const multiplier = portions / 4; 
    const html = currentRecipe.ingredients.map(ing => {
        if (['ít', 'chút', 'vài'].some(w => ing.toLowerCase().includes(w))) return "✔️ " + ing; 
        const match = ing.match(/^([\d.]+)/); 
        if (match) return "✔️ " + ing.replace(/^([\d.]+)/, +(parseFloat(match[1]) * multiplier).toFixed(1)); 
        return "✔️ " + ing; 
    }).join('<br>');
    document.getElementById('modalIngredients').innerHTML = html;
}

document.getElementById('portionCount').addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    if (val > 0 && val <= 20) renderIngredients(val);
});

function closeModal() {
    document.body.style.overflow = 'auto';
    document.getElementById('recipeModal').style.display = 'none';
}

searchInput.addEventListener('input', applyFilters);
sortSelect.addEventListener('change', applyFilters);
diffSelect.addEventListener('change', applyFilters);
favCheckbox.addEventListener('change', applyFilters);
timeInput.addEventListener('input', (e) => {
    timeValueDisplay.innerText = e.target.value;
    applyFilters();
});

let currentRandomRecipes = [];
function generateRandomMeal() {
    const canh = recipes.filter(r => r.category === "Canh");
    const man = recipes.filter(r => r.category === "Mặn");
    const xao = recipes.filter(r => r.category === "Xào/Luộc");
    const getRand = (arr) => arr[Math.floor(Math.random() * arr.length)];
    
    currentRandomRecipes = [getRand(canh), getRand(man), getRand(xao)];

    document.getElementById('randomMealResult').style.display = 'block';
    const cEl = document.getElementById('randomCanh'), mEl = document.getElementById('randomMan'), xEl = document.getElementById('randomXao');
    cEl.innerText = currentRandomRecipes[0].name; mEl.innerText = currentRandomRecipes[1].name; xEl.innerText = currentRandomRecipes[2].name;
    cEl.onclick = () => openModal(currentRandomRecipes[0]);
    mEl.onclick = () => openModal(currentRandomRecipes[1]);
    xEl.onclick = () => openModal(currentRandomRecipes[2]);
    document.getElementById('addToCartBtn').style.display = 'block';
}

// === HỆ THỐNG GIỎ HÀNG THÔNG MINH ===
function updateCartBadge() { document.getElementById('cartBadge').innerText = cartItems.length; }

function addRandomToCart() {
    let ingList = [];
    const names = currentRandomRecipes.map(r=>r.name).join(' + ');
    currentRandomRecipes.forEach(r => ingList = ingList.concat(r.ingredients));
    // Lưu Mâm ngẫu nhiên kèm theo mảng fullRecipes chứa đủ 3 công thức
    cartItems.push({ id: Date.now(), type: 'random', label: `Mâm ngẫu nhiên (${names})`, ingredients: ingList, fullRecipes: currentRandomRecipes });
    updateCartBadge();
    alert("✅ Đã đưa Mâm cơm vào Giỏ đi chợ!");
}

function addCurrentRecipeToCart() {
    const p = parseInt(document.getElementById('portionCount').value) || 4;
    const scaledIngs = currentRecipe.ingredients.map(ing => {
        const match = ing.match(/^([\d.]+)(.*)/);
        if (match && !['ít', 'chút', 'vài'].some(w => ing.toLowerCase().includes(w))) {
            return +(parseFloat(match[1]) * (p/4)).toFixed(1) + match[2];
        }
        return ing;
    });
    // Lưu món lẻ kèm fullRecipe và khẩu phần
    cartItems.push({ id: Date.now(), type: 'single', label: `${currentRecipe.name} (${p} người)`, ingredients: scaledIngs, fullRecipe: currentRecipe, portions: p });
    updateCartBadge();
    alert(`✅ Đã thêm ${currentRecipe.name} vào Giỏ!`);
}

function removeCartItem(index) {
    cartItems.splice(index, 1);
    updateCartBadge();
    openCartModal(); 
}

function openCartModal() {
    document.body.style.overflow = 'hidden'; 
    const listDiv = document.getElementById('cartListItems');
    if (cartItems.length === 0) {
        listDiv.innerHTML = '<p style="text-align: center; color: #888; font-style: italic;">Giỏ hàng trống.</p>';
    } else {
        let rHTML = '', sHTML = '';
        cartItems.forEach((item, index) => {
            const row = `
                <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px dashed #f4f1ea;">
                    <div style="display: flex; align-items: flex-start; gap: 10px; flex: 1;">
                        <input type="checkbox" class="cart-item-checkbox" value="${index}" onchange="checkCartSelection()" style="width: 18px; height: 18px; cursor: pointer; margin-top: 5px; accent-color: #e65100;">
                        <label style="cursor: pointer; font-weight: ${item.type === 'random' ? 'bold' : 'normal'}; color: #8c3a3a; line-height: 1.4;">${item.label}</label>
                    </div>
                    <span onclick="removeCartItem(${index})" style="cursor: pointer; color: #e53935; font-size: 1.2em; padding-left: 10px;" title="Xóa">🗑️</span>
                </div>`;
            if (item.type === 'random') rHTML += row; else sHTML += row;
        });
        listDiv.innerHTML = rHTML + (rHTML && sHTML ? `<div style="text-align: center; margin: 15px 0; position: relative;"><hr style="border-top: 1px dashed #d9d0c1;"><span style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #fffdf9; padding: 0 10px; color: #bcaaa4; font-size: 0.8em; font-weight: bold;">MÓN LẺ ĐƯỢC CHỌN</span></div>` : '') + sHTML;
    }
    goToScreen1();
    document.getElementById('cartModal').style.display = 'block';
    checkCartSelection();
}

function closeCartModal() {
    document.body.style.overflow = 'auto';
    document.getElementById('cartModal').style.display = 'none';
}

function checkCartSelection() {
    const checkedCount = document.querySelectorAll('.cart-item-checkbox:checked').length;
    // Hiển thị cả 2 nút Xem Công Thức và Tổng hợp khi có chọn
    document.getElementById('cartActionButtons').style.display = checkedCount > 0 ? 'flex' : 'none';
}

// === TÍNH NĂNG XEM CÔNG THỨC (NẤU RẢNH TAY) ===
let cookingList = [];
let currentCookingIndex = 0;

function goToCookingMode() {
    cookingList = [];
    document.querySelectorAll('.cart-item-checkbox:checked').forEach(cb => {
        const item = cartItems[cb.value];
        if (item.type === 'random') {
            // Nếu là mâm cơm, tách 3 món ra thành 3 trang riêng biệt
            item.fullRecipes.forEach(r => cookingList.push({ recipe: r, portions: 4 }));
        } else {
            // Món lẻ
            cookingList.push({ recipe: item.fullRecipe, portions: item.portions });
        }
    });

    if (cookingList.length === 0) return;

    currentCookingIndex = 0;
    renderCookingPage();
    
    document.getElementById('cartScreen1').style.display = 'none';
    document.getElementById('cartScreen2').style.display = 'none';
    document.getElementById('cartScreen3').style.display = 'block';
}

function renderCookingPage() {
    const data = cookingList[currentCookingIndex];
    const r = data.recipe;
    
    document.getElementById('cookingTitle').innerText = r.name;
    document.getElementById('cookingProgress').innerText = `${currentCookingIndex + 1}/${cookingList.length}`;
    document.getElementById('cookingImage').src = r.image;
    
    const multiplier = data.portions / 4;
    const ingHTML = r.ingredients.map(ing => {
        if (['ít', 'chút', 'vài'].some(w => ing.toLowerCase().includes(w))) return "✔️ " + ing; 
        const match = ing.match(/^([\d.]+)/); 
        if (match) return "✔️ " + ing.replace(/^([\d.]+)/, +(parseFloat(match[1]) * multiplier).toFixed(1)); 
        return "✔️ " + ing; 
    }).join('<br>');
    document.getElementById('cookingIngredients').innerHTML = ingHTML;
    
    document.getElementById('cookingInstructions').innerHTML = `<ol style="margin-left: 20px; padding-left: 5px;">${r.instructions.map(step => `<li style="margin-bottom: 12px; padding-left: 5px;">${step}</li>`).join('')}</ol>`;

    // Ẩn hiện nút điều hướng
    document.getElementById('btnPrevCook').style.visibility = currentCookingIndex === 0 ? 'hidden' : 'visible';
    document.getElementById('btnNextCook').style.visibility = currentCookingIndex === cookingList.length - 1 ? 'hidden' : 'visible';
}

function prevCookingPage() {
    if (currentCookingIndex > 0) { currentCookingIndex--; renderCookingPage(); }
}
function nextCookingPage() {
    if (currentCookingIndex < cookingList.length - 1) { currentCookingIndex++; renderCookingPage(); }
}

// === TÍNH NĂNG TỔNG HỢP ĐI CHỢ ===
function mergeIngredients(arr) {
    const merged = {}, nonMerge = [];
    arr.forEach(ing => {
        if (['ít', 'chút', 'vài'].some(w => ing.toLowerCase().includes(w))) { nonMerge.push(ing); return; }
        const m = ing.match(/^([\d.]+)\s*(.*)/);
        if (m) {
            let name = m[2].trim().toLowerCase().replace(' đen', '').replace(' ngon', '').replace(' khô', ' tím');
            if (merged[name]) merged[name].qty += parseFloat(m[1]);
            else merged[name] = { qty: parseFloat(m[1]), originalName: name };
        } else nonMerge.push(ing);
    });
    return Object.values(merged).map(v => `✔️ ${+(v.qty).toFixed(1)} ${v.originalName}`).concat(nonMerge.map(i => `✔️ ${i}`));
}

function goToScreen2() {
    let names = [], ings = [];
    document.querySelectorAll('.cart-item-checkbox:checked').forEach(cb => {
        const item = cartItems[cb.value];
        // Đã sửa lại để lấy tên thật đầy đủ cho danh sách chuẩn bị
        names.push(item.type === 'random' ? item.label : item.label.split(' (')[0]);
        ings = ings.concat(item.ingredients);
    });
    document.getElementById('shoppingForNames').innerText = names.join(' + ');
    document.getElementById('finalIngredientList').innerHTML = mergeIngredients(ings).map((ing, i) => `
        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; border-bottom: 1px solid #f4f1ea; padding-bottom: 8px;">
            <input type="checkbox" id="f_ing_${i}" onchange="toggleCartItem(this)" style="width: 20px; height: 20px; cursor: pointer; accent-color: #4caf50; margin-top: 3px;">
            <label for="f_ing_${i}" style="cursor: pointer;">${ing}</label>
        </div>`).join('');
    
    document.getElementById('cartScreen1').style.display = 'none';
    document.getElementById('cartScreen3').style.display = 'none';
    document.getElementById('cartScreen2').style.display = 'block';
}

function goToScreen1() {
    document.getElementById('cartScreen2').style.display = 'none';
    document.getElementById('cartScreen3').style.display = 'none';
    document.getElementById('cartScreen1').style.display = 'block';
}

function toggleCartItem(cb) {
    cb.nextElementSibling.style.textDecoration = cb.checked ? 'line-through' : 'none';
    cb.nextElementSibling.style.color = cb.checked ? '#ccc' : '#4a3b32';
}

window.onclick = function(e) {
    if (e.target === document.getElementById('recipeModal')) closeModal();
    if (e.target === document.getElementById('cartModal')) closeCartModal();
}
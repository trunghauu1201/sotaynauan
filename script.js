// 1. Khai báo mảng rỗng để chứa dữ liệu từ Database
let recipes = [];

// Lấy danh sách ID món ăn đã lưu từ LocalStorage (nếu chưa có thì tạo mảng rỗng)
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// 2. Lấy các phần tử từ HTML
const listContainer = document.getElementById('recipe-list');
const searchInput = document.getElementById('searchIngredient');
const sortSelect = document.getElementById('sortName');
const diffSelect = document.getElementById('filterDifficulty');
const timeInput = document.getElementById('filterTime');
const timeValueDisplay = document.getElementById('timeValue');
const favCheckbox = document.getElementById('filterFav'); // Đã thêm biến này

// 3. Hàm TẢI DỮ LIỆU TỪ FILE JSON (Mô phỏng API Backend)
async function loadData() {
    try {
        const response = await fetch('data.json');
        recipes = await response.json();
        applyFilters(); 
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        listContainer.innerHTML = '<p style="color: red; text-align: center;">Không thể kết nối đến cơ sở dữ liệu!</p>';
    }
}

// Chạy hàm tải dữ liệu ngay khi load trang
loadData();

// 4. Hàm hiển thị danh sách món ăn
function renderRecipes(data) {
    listContainer.innerHTML = ''; 
    if(data.length === 0) {
        listContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #777;">Không tìm thấy món ăn phù hợp với bộ lọc.</p>';
        return;
    }

    data.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => openModal(recipe);
        
        // ĐÃ SỬA LỖI 1: Kiểm tra yêu thích và gán icon tim
        const isFav = favorites.includes(recipe.id);
        const heartIcon = isFav ? '❤️' : '🤍';
        
        // Bên trong hàm renderRecipes...
        card.innerHTML = `
            <div class="heart-btn" onclick="toggleFavorite(event, ${recipe.id})">${heartIcon}</div>
            
            <img class="card-image" src="${recipe.image}" alt="${recipe.name}">
            
            <div class="card-content">
                <h3>${recipe.name}</h3>
                <p>⏱ ${recipe.time} phút | ⭐ ${recipe.difficulty}/5</p>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// 5. Hàm xử lý LỌC và SẮP XẾP
function applyFilters() {
    const keyword = searchInput.value.toLowerCase();
    const maxTime = parseInt(timeInput.value);
    const difficulty = diffSelect.value;
    const sortOrder = sortSelect.value;
    const showFavOnly = favCheckbox.checked; // Lấy trạng thái ô tick yêu thích

    let filteredData = recipes.filter(recipe => {
        const matchName = recipe.name.toLowerCase().includes(keyword);
        const matchIngredient = recipe.ingredients.some(ing => ing.toLowerCase().includes(keyword));
        const matchKeyword = matchName || matchIngredient;

        const matchTime = recipe.time <= maxTime;
        const matchDiff = difficulty === "" || recipe.difficulty == difficulty;
        
        // ĐÃ SỬA LỖI 2: Thêm logic lọc món yêu thích
        const matchFav = !showFavOnly || favorites.includes(recipe.id);
        
        return matchKeyword && matchTime && matchDiff && matchFav;
    });

    filteredData.sort((a, b) => {
        if (sortOrder === 'asc') return a.name.localeCompare(b.name);
        return b.name.localeCompare(a.name);
    });

    renderRecipes(filteredData);
}

// 6. Hàm Toggle Yêu thích (Thả tim)
function toggleFavorite(event, recipeId) {
    event.stopPropagation(); // Ngăn mở Modal khi bấm tim
    
    if (favorites.includes(recipeId)) {
        favorites = favorites.filter(id => id !== recipeId);
    } else {
        favorites.push(recipeId);
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    applyFilters();
}

// 7. Hàm điều khiển Modal
let currentRecipe = null;
function openModal(recipe) {
    currentRecipe = recipe;
    document.getElementById('modalTitle').innerText = recipe.name;
    
    // Mặc định luôn hiện khẩu phần cho 4 người (chuẩn mâm cơm gia đình)
    document.getElementById('portionCount').value = 4;
    renderIngredients(4);
    
    const stepsHTML = recipe.instructions.map(step => `<li>${step}</li>`).join('');
    document.getElementById('modalInstructions').innerHTML = `<ol class="instruction-list">${stepsHTML}</ol>`;
    
    document.getElementById('recipeModal').style.display = 'block';
}
// Hàm mới: Tính toán và render nguyên liệu theo số người
function renderIngredients(portions) {
    if (!currentRecipe) return;
    
    // Công thức gốc trong data.json đang được thiết kế cho 4 người ăn
    const multiplier = portions / 4; 
    
    const ingredientsHTML = currentRecipe.ingredients.map(ing => {
        // Thuật toán tìm con số ở đầu chuỗi (VD: "300g thịt" -> tìm ra số 300)
        const match = ing.match(/^([\d.]+)/); 
        if (match) {
            const baseNum = parseFloat(match[1]);
            const newNum = +(baseNum * multiplier).toFixed(1); // Nhân lên và làm tròn
            return "✔️ " + ing.replace(/^([\d.]+)/, newNum); // Thay số mới vào
        }
        return "✔️ " + ing; // Nếu không có số (VD: "Tiêu, gia vị") thì giữ nguyên
    }).join('<br>');
    
    document.getElementById('modalIngredients').innerHTML = ingredientsHTML;
}
// Thêm sự kiện: Khi người dùng bấm tăng/giảm số người, gọi lại hàm tính toán
document.getElementById('portionCount').addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    if (val > 0 && val <= 20) {
        renderIngredients(val);
    }
});

function closeModal() {
    document.getElementById('recipeModal').style.display = 'none';
}

// 8. Lắng nghe sự kiện thay đổi từ người dùng
searchInput.addEventListener('input', applyFilters);
sortSelect.addEventListener('change', applyFilters);
diffSelect.addEventListener('change', applyFilters);
timeInput.addEventListener('input', (e) => {
    timeValueDisplay.innerText = e.target.value;
    applyFilters();
});
favCheckbox.addEventListener('change', applyFilters); // Lắng nghe ô tick yêu thích

// 9. Tính năng Random Mâm Cơm
function generateRandomMeal() {
    const monCanh = recipes.filter(r => r.category === "Canh");
    const monMan = recipes.filter(r => r.category === "Mặn");
    const monXao = recipes.filter(r => r.category === "Xào/Luộc");

    const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const canhPick = getRandomItem(monCanh);
    const manPick = getRandomItem(monMan);
    const xaoPick = getRandomItem(monXao);

    document.getElementById('randomMealResult').style.display = 'block';

    const canhEl = document.getElementById('randomCanh');
    const manEl = document.getElementById('randomMan');
    const xaoEl = document.getElementById('randomXao');

    canhEl.innerText = canhPick.name;
    manEl.innerText = manPick.name;
    xaoEl.innerText = xaoPick.name;

    canhEl.onclick = () => openModal(canhPick);
    manEl.onclick = () => openModal(manPick);
    xaoEl.onclick = () => openModal(xaoPick);
}

// 10. Đóng Modal khi click ra ngoài vùng nền tối
window.onclick = function(event) {
    const modal = document.getElementById('recipeModal');
    // Nếu nơi click chuột chính là cái nền đen của modal (không phải bên trong khung trắng)
    if (event.target === modal) {
        closeModal(); // Thì gọi hàm đóng hộp thoại
    }
}
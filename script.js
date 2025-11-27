// משתנים גלובליים
let recipesData = {};
let nutritionData = {};
let allRecipes = [];
let filteredRecipes = [];
let currentSeason = 'all';
let currentTab = 'recipes';
let currentAgeFilter = 'all';

// טעינת האפליקציה
$(document).ready(function() {
    console.log('אפליקצייה זאת נבנתה ע"י איתי חתואל');
    console.log('ליצירת קשר: https://dev.etai.co.il');
    console.log('כתובת אתר זה: https://kidsfood.etai.co.il');
    console.log('טעינת האפליקציה...');

    loadRecipes();
    loadNutritionData();
    initializeEventListeners();
    showBackToTop();
    $('.emergency-recipe-display').hide();
    $('.category').addClass('collapsed');

    console.log('הפעלת האפליקציה הושלמה בהצלחה');
});

const share_btn = $('#share-btn');
share_btn.on('click', function() {
    // שיתוף האפליקצייה
    if (navigator.share) {
        navigator.share({
            title: 'מתכונים לארוחת בוקר לילדים',
            url: window.location.href
        }).then(() => {
            console.log('שיתוף הצליח');
        }).catch((error) => {
            console.error('שגיאה בשיתוף:', error);
        });
    } else {
        console.warn('שיתוף לא נתמך בדפדפן זה');
    }
});






// טעינת המתכונים מקובץ JSON
async function loadRecipes() {
    try {
        const response = await fetch('recipes.json');
        recipesData = await response.json();
        
        // יצירת מערך של כל המתכונים
        allRecipes = [];
        const categoryOrder = [
            'ארוחת_חירום_לגן', 'דגנים_וקטניות', 'ביצים', 'פירות_ומיצים',
            'לחמים_ומאפים', 'יוגורטים_ומוצרי_חלב', 'מנות_חמות_חורף',
            'מנות_קרות_קיץ', 'מתכונים_מיוחדים', 'מתכונים_לגילאי_1_3',
            'חלבונים_ובניית_שרירים', 'פחמימות_מורכבות',
            'ויטמינים_ומינרלים', 'דגנים_מלאים_ובריאותיים'
        ];
        
        let globalRecipeIndex = 0; // מונה גלובלי למתכונים
        
        categoryOrder.forEach(categoryKey => {
            if (recipesData.categories[categoryKey]) {
                const category = recipesData.categories[categoryKey];
                category.recipes.forEach((recipe, index) => {
                    // יצירת ID ייחודי לכל מתכון
                    recipe.id = `recipe_${globalRecipeIndex}`;
                    recipe.categoryKey = categoryKey;
                    recipe.categoryName = category.name;
                    recipe.originalIndex = index; // שמירת האינדקס המקורי
                    recipe.categoryIndex = index; // שמירת האינדקס בקטגוריה
                    allRecipes.push(recipe);
                    globalRecipeIndex++;
                });
            }
        });
        
        filteredRecipes = [...allRecipes];
        
        // בדיקת ID כפולים
        const ids = allRecipes.map(r => r.id);
        const uniqueIds = [...new Set(ids)];
        if (ids.length !== uniqueIds.length) {
            console.error('נמצאו ID כפולים! יש', ids.length - uniqueIds.length, 'כפילויות');
        } else {
            console.log('✅ כל ה-ID ייחודיים');
        }
        
        displayRecipes();
        updateStats();
        initializeEmergencyRecipes();
        
        // הוספת מספר המתכונים לכותרות הקטגוריות
        showAmountOfRecipesFromCategory();
        
    } catch (error) {
        console.error('שגיאה בטעינת המתכונים:', error);
        showError('שגיאה בטעינת המתכונים. אנא בדוק את הקובץ recipes.json');
    }
}

// טעינת הערכים התזונתיים מקובץ JSON
async function loadNutritionData() {
    try {
        const response = await fetch('values.json');
        nutritionData = await response.json();
        console.log('טעינת נתונים תזונתיים הושלמה:', Object.keys(nutritionData.nutritional_values).length, 'מרכיבים');
        
        // נחכה שה-DOM יהיה מוכן לפני הצגת הנתונים
        setTimeout(() => {
            displayNutritionData();
            displayAllergenInfo();
        }, 100);
    } catch (error) {
        console.error('שגיאה בטעינת הערכים התזונתיים:', error);
    }
}

// הצגת הערכים התזונתיים - רשימת מרכיבים
function displayNutritionData() {
    const ingredientsList = $('#ingredients-list');
    
    if (!ingredientsList.length) {
        console.warn('לא נמצא אלמנט ingredients-list');
        return;
    }
    
    ingredientsList.empty();
    
    if (!nutritionData || !nutritionData.nutritional_values) {
        console.warn('נתונים תזונתיים לא זמינים');
        ingredientsList.html('<p style="text-align:center; padding:20px; color:#666;">טוען ערכים תזונתיים...</p>');
        return;
    }

    // איסוף כל המרכיבים שמופיעים בפועל במתכונים
    const usedIngredients = new Set();
    allRecipes.forEach(recipe => {
        recipe.ingredients.forEach(ingredient => {
            const cleanName = cleanIngredientName(ingredient);
            usedIngredients.add(cleanName);
        });
    });


    // הוספת כל המרכיבים מה-JSON
    Object.keys(nutritionData.nutritional_values).forEach(key => {
        const ingredient = nutritionData.nutritional_values[key];
        const ingredientCard = createIngredientCard(ingredient, key, usedIngredients.has(ingredient.name));
        ingredientsList.append(ingredientCard);
    });

}

// יצירת כרטיס מרכיב
function createIngredientCard(ingredient, key, isUsed = false) {
    const usedClass = isUsed ? 'ingredient-used' : '';
    const usedBadge = isUsed ? '<span class="used-badge">✨ בשימוש</span>' : '';
    
    return $(`
        <div class="ingredient-card ${usedClass}" data-ingredient="${key}">
            <h4>${ingredient.name} ${usedBadge}</h4>
            <div class="ingredient-quick-info">
                <span class="calories">🔥 ${ingredient.calories} קלוריות</span>
                <span class="protein">💪 ${ingredient.protein}g חלבון</span>
            </div>
        </div>
    `);
}

// הצגת פרטי מרכיב נבחר
function showIngredientDetails(ingredient, key) {
    const selectedDiv = $('#selected-ingredient');
    
    // בדיקה שהמרכיב קיים ויש לו את השדות הנדרשים
    if (!ingredient) {
        selectedDiv.html('<p>מרכיב לא נמצא</p>');
        selectedDiv.show();
        return;
    }
    
    selectedDiv.html(`
        <div class="ingredient-details">
            <h3>${ingredient.name || 'ללא שם'}</h3>
            <div class="nutrition-grid">
                <div class="nutrition-item">
                    <span class="label">קלוריות:</span>
                    <span class="value">${ingredient.calories || 0} קלוריות ל100 גרם</span>
                </div>
                <div class="nutrition-item">
                    <span class="label">חלבון:</span>
                    <span class="value">${ingredient.protein || 0} גרם</span>
                </div>
                <div class="nutrition-item">
                    <span class="label">פחמימות:</span>
                    <span class="value">${ingredient.carbohydrates || ingredient.carbs || 0} גרם</span>
                </div>
                <div class="nutrition-item">
                    <span class="label">שומן:</span>
                    <span class="value">${ingredient.fat || 0} גרם</span>
                </div>
                <div class="nutrition-item">
                    <span class="label">סיבים:</span>
                    <span class="value">${ingredient.fiber || 0} גרם</span>
                </div>
                <div class="nutrition-item">
                    <span class="label">סוכר:</span>
                    <span class="value">${ingredient.sugar || 0} גרם</span>
                </div>
            </div>
            
            ${ingredient.allergens && ingredient.allergens.length > 0 ? `
                <div class="allergens-section">
                    <h4>אלרגנים:</h4>
                    <div class="allergens-list">
                        ${ingredient.allergens.map(allergen => 
                            `<span class="allergen-badge">${allergen}</span>`
                        ).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${ingredient.gluten_free !== undefined ? 
                ingredient.gluten_free ? 
                '<div class="dietary-info"><span class="gluten-free-badge">✅ ללא גלוטן</span></div>' : 
                '<div class="dietary-info"><span class="gluten-badge">⚠️ מכיל גלוטן</span></div>'
                : ''
            }
        </div>
    `);
    
    selectedDiv.show();
}

// ניקוי שם מרכיב לחיפוש
function cleanIngredientName(ingredientName) {
    return ingredientName
        .replace(/\d+/g, '') // הסרת מספרים
        .replace(/גרם|כף|כוס|יחידה|יחידות|מ"ל|ליטר|ק"ג|גרמים|כפות|כוסות/gi, '') // הסרת יחידות מידה
        .replace(/\s+/g, ' ') // החלפת רווחים כפולים ברווח יחיד
        .replace(/[()]/g, '') // הסרת סוגריים
        .trim()
        .toLowerCase();
}

// חיפוש ערכים תזונתיים לפי שם
function findNutritionByName(ingredientName) {
    if (!nutritionData || !nutritionData.nutritional_values) {
        return null;
    }
    
    const normalizedName = cleanIngredientName(ingredientName);
    
    // חיפוש ישיר בשם
    for (let key in nutritionData.nutritional_values) {
        const nutrition = nutritionData.nutritional_values[key];
        if (nutrition && nutrition.name && nutrition.name.toLowerCase().includes(normalizedName)) {
            return nutrition;
        }
    }
    
    // חיפוש חלקי - אם המרכיב מכיל מילה מהמרכיב בבסיס הנתונים
    for (let key in nutritionData.nutritional_values) {
        const nutrition = nutritionData.nutritional_values[key];
        if (nutrition && nutrition.name) {
            const nutritionWords = nutrition.name.toLowerCase().split(/\s+/);
            const ingredientWords = normalizedName.split(/\s+/);
            
            // בדיקה אם יש התאמה של מילה
            for (let nutritionWord of nutritionWords) {
                for (let ingredientWord of ingredientWords) {
                    if (nutritionWord.length > 2 && ingredientWord.length > 2 && 
                        (nutritionWord.includes(ingredientWord) || ingredientWord.includes(nutritionWord))) {
                        return nutrition;
                    }
                }
            }
        }
    }
    
    // חיפוש במילות מפתח נוספות
    const keywordMap = {
        'ביצה': 'ביצה',
        'ביצים': 'ביצה',
        'חלב': 'חלב',
        'חלב שקדים': 'חלב_שקדים',
        'חלב קוקוס': 'חלב_קוקוס', 
        'לחם': 'לחם_מלא',
        'לחם מלא': 'לחם_מלא',
        'לחם לבן': 'לחם_לבן',
        'שיבולת שועל': 'שיבולת_שועל',
        'שיבולת': 'שיבולת_שועל',
        'בננה': 'בננה',
        'בננות': 'בננה',
        'תפוח': 'תפוח',
        'תפוחים': 'תפוח',
        'יוגורט': 'יוגורט',
        'יוגורטים': 'יוגורט',
        'גבינה': 'גבינת_קוטג',
        'גבינת קוטג': 'גבינת_קוטג',
        'גבינה צהובה': 'גבינה_צהובה',
        'גבינה לבנה': 'גבינה_לבנה',
        'אבוקדו': 'אבוקדו',
        'דבש': 'דבש',
        'פסטה': 'פסטה_קטנה',
        'אורז': 'אורז_מבושל',
        'חמאת בוטנים': 'חמאת_בוטנים',
        'פיתה': 'פיתה',
        'חלה': 'חלה',
        'חמאה': 'חמאה',
        'עגבניות': 'עגבניות_שרי',
        'עגבניה': 'עגבניות_שרי',
        'מלפפון': 'מלפפון',
        'מלפפונים': 'מלפפון',
        'גזר': 'גזר',
        'גזרים': 'גזר',
        'בטטה': 'בטטה',
        'קינמון': 'קינמון',
        'קינואה': 'קינואה',
        'כוסמין': 'כוסמין',
        'טף': 'טף',
        'אגוזי מלך': 'אגוזי_מלך',
        'זרעי צ\'יא': 'זרעי_ציה',
        'זרעי ציא': 'זרעי_ציה',
        'תותים': 'תותים',
        'תותי שדה': 'תותים',
        'אוכמניות': 'אוכמניות',
        'מנגו': 'מנגו',
        'אקאי': 'אקאי',
        'ברוקולי': 'ברוקולי',
        'כרוב נא': 'כרוב_נא',
        'פטריות': 'פטריות',
        'כמון': 'כמון',
        'כורכום': 'כורכום',
        'זנגוויל': 'זנגוויל',
        'טחינה': 'טחינה',
        'גרנולה': 'גרנולה',
        'אמרנט': 'אמרנט',
        'זרעי דלעת': 'זרעי_דלעת',
        'שמן זית': 'שמן_זית',
        'שמן': 'שמן_זית',
        'דגנים': 'שיבולת_שועל',
        'דגן': 'שיבולת_שועל',
        'קטניות': 'עדשים',
        'עדשים': 'עדשים'
    };
    
    for (let keyword in keywordMap) {
        if (normalizedName.includes(keyword)) {
            const nutritionItem = nutritionData.nutritional_values[keywordMap[keyword]];
            if (nutritionItem) {
                return nutritionItem;
            }
        }
    }
    
    return null;
}

// חישוב ערכים תזונתיים למתכון
function calculateRecipeNutrition(recipe) {
    if (!recipe || !recipe.ingredients || !nutritionData || !nutritionData.nutritional_values) {
        return {
            calories: 0,
            protein: 0,
            carbohydrates: 0,
            fat: 0,
            coverage: 0
        };
    }
    
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let foundIngredients = 0;
    
    recipe.ingredients.forEach(ingredient => {
        const nutrition = findNutritionByName(ingredient);
        if (nutrition && nutrition.calories !== undefined) {
            // נניח שכל מרכיב הוא בערך 50 גרם (ממוצע)
            const weight = 0.5; // 50 גרם = 0.5 מ-100 גרם
            
            totalCalories += (nutrition.calories || 0) * weight;
            totalProtein += (nutrition.protein || 0) * weight;
            totalCarbs += (nutrition.carbohydrates || nutrition.carbs || 0) * weight;
            totalFat += (nutrition.fat || 0) * weight;
            foundIngredients++;
        } else {
            // מרכיב לא נמצא - הוספת לוג לדיבוג
            console.log(`מרכיב לא נמצא: "${ingredient}" (לאחר ניקוי: "${cleanIngredientName(ingredient)}")`);
        }
    });
    
    return {
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein * 10) / 10,
        carbohydrates: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        coverage: Math.round((foundIngredients / recipe.ingredients.length) * 100)
    };
}

// חיפוש ערכים תזונתיים חכם
function performNutritionSearch() {
    const query = $('#nutrition-search-input').val().toLowerCase();
    
    if (!query) {
        displayNutritionData();
        return;
    }
    
    const ingredientsList = $('#ingredients-list');
    ingredientsList.empty();
    
    Object.keys(nutritionData.nutritional_values).forEach(key => {
        const ingredient = nutritionData.nutritional_values[key];
        if (ingredient.name.toLowerCase().includes(query) || 
            key.toLowerCase().includes(query)) {
            
            const ingredientCard = createIngredientCard(ingredient, key, true);
            ingredientsList.append(ingredientCard);
        }
    });
}

// סינון ערכים תזונתיים
function filterNutritionData(filter) {
    const ingredientsList = $('#ingredients-list');
    ingredientsList.empty();
    
    if (!nutritionData || !nutritionData.nutritional_values) {
        return;
    }
    
    Object.keys(nutritionData.nutritional_values).forEach(key => {
        const ingredient = nutritionData.nutritional_values[key];
        let shouldShow = false;
        
        switch(filter) {
            case 'all':
                shouldShow = true;
                break;
            case 'gluten_free':
                shouldShow = ingredient.gluten_free === true;
                break;
            case 'low_sugar':
                shouldShow = ingredient.sugar_level === 'נמוך' || ingredient.sugar < 5;
                break;
            case 'high_protein':
                shouldShow = ingredient.protein > 10;
                break;
        }
        
        if (shouldShow) {
            const ingredientCard = createIngredientCard(ingredient, key, false);
            ingredientsList.append(ingredientCard);
        }
    });
}

// חיפוש חכם - מתכונים או מרכיבים לפי כרטיסיה
function performSmartSearch() {
    const query = $('#search-input').val().toLowerCase();
    
    if (currentTab === 'nutrition') {
        // אם אנחנו בכרטיסיית ערכים תזונתיים - חפש מרכיבים
        $('#nutrition-search-input').val(query);
        performNutritionSearch();
    } else {
        // אם אנחנו בכרטיסיית מתכונים - חפש מתכונים או לפי מרכיבים
        performRecipeSearch();
    }
}

// חיפוש מתכונים משופר
function performRecipeSearch() {
    const query = $('#search-input').val().toLowerCase();
    
    if (!query) {
        filteredRecipes = [...allRecipes];
        displayRecipes();
        updateStats();
        return;
    }
    
    filteredRecipes = allRecipes.filter(recipe => {
        // חיפוש בשם המתכון
        if (recipe.name.toLowerCase().includes(query)) {
            return true;
        }
        
        // חיפוש במרכיבים
        if (recipe.ingredients.some(ingredient => 
            ingredient.toLowerCase().includes(query))) {
            return true;
        }
        
        // חיפוש בהוראות
        if (recipe.instructions.toLowerCase().includes(query)) {
            return true;
        }
        
        return false;
    });
    
    displayRecipes();
    updateStats();
}

// הצגת המתכונים
function displayRecipes() {
    console.log('מספר המתכונים המוצגים:', filteredRecipes.length);
    
    // ניקוי כל הקטגוריות
    $('.recipes-grid').empty();
    
    // קיבוץ המתכונים לפי קטגוריות
    const categorizedRecipes = {};
    filteredRecipes.forEach(recipe => {
        if (!categorizedRecipes[recipe.categoryKey]) {
            categorizedRecipes[recipe.categoryKey] = [];
        }
        categorizedRecipes[recipe.categoryKey].push(recipe);
    });
    
    // הצגת מתכונים לכל קטגוריה
    const categoryOrder = [
        'ארוחת_חירום_לגן', 'דגנים_וקטניות', 'ביצים', 'פירות_ומיצים',
        'לחמים_ומאפים', 'יוגורטים_ומוצרי_חלב', 'מנות_חמות_חורף',
        'מנות_קרות_קיץ', 'מתכונים_מיוחדים', 'מתכונים_לגילאי_1_3',
        'חלבונים_ובניית_שרירים', 'פחמימות_מורכבות',
        'ויטמינים_ומינרלים', 'דגנים_מלאים_ובריאותיים'
    ];
    
    categoryOrder.forEach(categoryKey => {
        if (recipesData.categories[categoryKey]) {
            const categoryElement = $(`.category[data-category="${categoryKey}"]`);
            const recipesGrid = categoryElement.find('.recipes-grid');
            const categoryRecipes = categorizedRecipes[categoryKey] || [];
            
            if (categoryRecipes.length > 0) {
                categoryElement.removeClass('filtered').show();
                categoryRecipes.forEach(recipe => {
                    const recipeCard = createRecipeCard(recipe);
                    recipesGrid.append(recipeCard);
                });
            } else {
                categoryElement.addClass('filtered').hide();
            }
        }
    });
    
    // הצגת הודעת "אין תוצאות" במידת הצורך
    toggleNoResultsMessage();
}

// יצירת כרטיס מתכון
function createRecipeCard(recipe) {
    const seasonIcon = getSeasonIcon(recipe.season);
    const difficultyClass = getDifficultyClass(recipe.difficulty);
    
    // וידוא שיש למתכון ID
    if (!recipe.id) {
        console.error('מתכון ללא ID:', recipe.name);
        recipe.id = `unknown_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    
    // חישוב ערכים תזונתיים למתכון
    const nutrition = calculateRecipeNutrition(recipe);
    const nutritionDisplay = nutrition.coverage > 20 ? 
        `<div class="recipe-nutrition">
            🔥 ${nutrition.calories} קלוריות | 💪 ${nutrition.protein}g חלבון
        </div>` : '';
    
    return $(`
        <div class="recipe-card" data-recipe-id="${recipe.id}">
            <div class="recipe-name">${recipe.name}</div>
            <div class="recipe-info">
                <span class="info-tag age-tag">👶 ${recipe.age_range}</span>
                <span class="info-tag season-tag">${seasonIcon} ${recipe.season}</span>
                <span class="info-tag time-tag">⏰ ${recipe.prep_time}</span>
            </div>
            <div class="recipe-ingredients">
                <strong>מצרכים עיקריים:</strong> ${recipe.ingredients.slice(0, 3).join(', ')}
                ${recipe.ingredients.length > 3 ? ' ועוד...' : ''}
            </div>
            ${nutritionDisplay}
            <div class="recipe-difficulty ${difficultyClass}">${recipe.difficulty}</div>
        </div>
    `);
}

function showAmountOfRecipesFromCategory() {
    // הוספת מספר המתכונים בכותרת כל הקטגוריות
    $('.category').each(function() {
        const categoryKey = $(this).data('category');
        const categoryData = recipesData.categories[categoryKey];
        if (categoryData) {
            const recipeCount = categoryData.recipes.length;
            const header = $(this).find('.category-header h2');
            const currentText = header.text();
            
            // בדיקה אם המספר כבר קיים בכותרת (למנוע כפילות)
            if (!currentText.includes('מתכונים') || !currentText.match(/\d+\s+מתכונים/)) {
                // הסרת מספר קיים אם יש כזה
                const cleanText = currentText.replace(/\s*-\s*\d+\s+מתכונים/, '');
                header.text(`${cleanText} - ${recipeCount} מתכונים`);
            }
        }
    });
}

// קבלת אייקון עונה
function getSeasonIcon(season) {
    const icons = {
        'כל השנה': '🌟',
        'חורף': '❄️',
        'קיץ': '☀️',
        'אביב': '🌸',
        'סתיו': '🍂'
    };
    return icons[season] || '🌟';
}

// קבלת מחלקת קושי
function getDifficultyClass(difficulty) {
    const classes = {
        'קל': 'easy',
        'בינוני': 'medium',
        'קשה': 'hard'
    };
    return classes[difficulty] || 'easy';
}

// הצגת מידע על אלרגנים
function displayAllergenInfo() {
    const allergenList = $('#allergen-list');
    if (!allergenList.length) return;
    
    allergenList.empty();
    
    if (!nutritionData?.allergen_info) {
        console.warn('מידע אלרגנים לא זמין');
        return;
    }
    
    Object.keys(nutritionData.allergen_info).forEach(key => {
        const allergen = nutritionData.allergen_info[key];
        const allergenCard = $(`
            <div class="allergen-card">
                <h4>${key.replace('_', ' ')}</h4>
                <p>${allergen.description}</p>
                <div class="alternatives">חלופות: ${allergen.alternatives}</div>
            </div>
        `);
        allergenList.append(allergenCard);
    });
}

// אתחול מאזיני אירועים
function initializeEventListeners() {
    // מעבר בין כרטיסיות
    $('.tab-btn').click(function() {
        const tab = $(this).data('tab');
        switchTab(tab);
    });
    
    // חיפוש כללי
    $('#search-input').on('input', performSmartSearch);
    $('#search-btn').on('click', performSmartSearch);
    
    // חיפוש בערכים תזונתיים
    $('#nutrition-search-input').on('input', performNutritionSearch);
    
    // סינון לפי עונה
    $('.filter-btn').click(function() {
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        currentSeason = $(this).data('season');
        filterRecipesBySeason();
    });
    
    // סינון לפי גיל
    $('#age-filter').change(function() {
        currentAgeFilter = $(this).val();
        filterRecipesByAge();
    });
    
    // פילטרי תזונה
    $('.nutrition-filter-btn').click(function() {
        $('.nutrition-filter-btn').removeClass('active');
        $(this).addClass('active');
        const filter = $(this).data('filter');
        filterNutritionData(filter);
    });
    
    // לחיצה על כרטיס מרכיב
    $(document).on('click', '.ingredient-card', function() {
        const ingredientKey = $(this).data('ingredient');
        const ingredient = nutritionData.nutritional_values[ingredientKey];
        if (ingredient) {
            showIngredientDetails(ingredient, ingredientKey);
        }
    });
    
    // לחיצה על כרטיס מתכון
    $(document).on('click', '.recipe-card', function() {
        const recipeId = $(this).data('recipe-id');
        const recipe = allRecipes.find(r => r.id === recipeId);
        if (recipe) {
            showRecipeModal(recipe);
        } else {
            console.error('מתכון לא נמצא עבור ID:', recipeId);
            showError('שגיאה: המתכון לא נמצא. אנא נסה לרענן את הדף.');
        }
    });
    
    // פתיחה/סגירת קטגוריות
    $('.category-header').click(function() {
        const category = $(this).closest('.category');
        const recipesGrid = category.find('.recipes-grid');
        const toggleIcon = $(this).find('.toggle-icon');
        
        if (recipesGrid.is(':visible')) {
            recipesGrid.slideUp();
            toggleIcon.text('▶');
        } else {
            recipesGrid.slideDown();
            toggleIcon.text('▼');
        }
    });
    
    // סגירת מודלים
    $(document).on('click', '.close', function() {
        closeModal();
    });
    
    $(document).on('click', '.modal', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
    
    // מניעת סגירה בלחיצה על תוכן המודל
    $(document).on('click', '.modal-content', function(e) {
        e.stopPropagation();
    });
    
    // מאזיני אירועים למתכוני חירום
    $('#randomEmergencyRecipe').click(function() {
        $('.emergency-recipe-display').show();
        showRandomEmergencyRecipe();
    });
    
    $('#nextEmergencyRecipe').click(function() {
        showNextEmergencyRecipe();
    });
    
    $('#prevEmergencyRecipe').click(function() {
        showPrevEmergencyRecipe();
    });
    
    // לחיצה על "צפה במתכון המלא" במתכון חירום
    $(document).on('click', '.view-full-recipe', function() {
        const recipeId = $(this).data('recipe-id');
        const recipe = allRecipes.find(r => r.id === recipeId);
        if (recipe) {
            showRecipeModal(recipe);
        } else {
            console.error('מתכון חירום לא נמצא עבור ID:', recipeId);
            showError('שגיאה: מתכון החירום לא נמצא. אנא נסה לרענן את הדף.');
        }
    });
}

// מעבר בין כרטיסיות
function switchTab(tab) {
    currentTab = tab;
    
    // עדכון כפתורי הכרטיסיות
    $('.tab-btn').removeClass('active');
    $(`.tab-btn[data-tab="${tab}"]`).addClass('active');
    
    // הצגת התוכן המתאים
    $('.tab-content').removeClass('active');
    $(`#${tab}-tab`).addClass('active');
    
    // עדכון placeholder של החיפוש
    if (tab === 'nutrition') {
        $('#search-input').attr('placeholder', 'חפש מרכיב...');
    } else {
        $('#search-input').attr('placeholder', 'חפש מתכון או מרכיב...');
    }
}

// הצגת מודל מתכון
function showRecipeModal(recipe) {
    const nutrition = calculateRecipeNutrition(recipe);
    const nutritionSection = nutrition.coverage > 20 ? `
        <div class="modal-nutrition">
            <h4>ערכים תזונתיים (משוערים):</h4>
            <div class="nutrition-summary">
                <span>🔥 ${nutrition.calories} קלוריות</span>
                <span>💪 ${nutrition.protein}g חלבון</span>
                <span>⚡ ${nutrition.carbohydrates}g פחמימות</span>
                <span>🥑 ${nutrition.fat}g שומן</span>
            </div>
            <div class="coverage-note">כיסוי מרכיבים: ${nutrition.coverage}%   <button class="share-recipe-btn">שיתוף מתכון</button></div>
        </div>
    ` : '';

    const modalContent = `
        <h2>${recipe.name}</h2>
        <div class="recipe-meta">
            <span class="age-range">👶 גילאי: ${recipe.age_range}</span>
            <span class="season">${getSeasonIcon(recipe.season)} עונה: ${recipe.season}</span>
            <span class="prep-time">⏰ זמן הכנה: ${recipe.prep_time}</span>
            <span class="difficulty ${getDifficultyClass(recipe.difficulty)}">רמת קושי: ${recipe.difficulty}</span>
        </div>
        ${nutritionSection}
        <div class="recipe-ingredients">
            <h3>מצרכים:</h3>
            <ul>
                ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
            </ul>
        </div>
        <div class="recipe-instructions">
            <h3>הוראות הכנה:</h3>
            <p>${recipe.instructions}</p>
        </div>
        ${recipe.nutrition_tips ? `
            <div class="nutrition-tips">
                <h3>טיפים תזונתיים:</h3>
                <p>${recipe.nutrition_tips}</p>
            </div>
        ` : ''}
    `;
    
    $('#modal-recipe-content').html(modalContent);
    $('#recipe-modal').show();
    const button2 = $('.share-recipe-btn');
    button2.click(function() {
        const shareText = `מתכון: ${recipe.name}\nמצרכים: ${recipe.ingredients.join(', ')}\nהוראות: ${recipe.instructions} \nלפרטים נוספים בקרו באתר המתכונים שלנו!\n${window.location.href}`;
        navigator.share({ text: shareText }).then(() => {
        }).catch(err => {
            console.error('שגיאה בהעתקת המתכון:', err);
            alert('שגיאה בהעתקת המתכון. אנא נסה שוב.');
        });
    });
}


// סגירת מודל
function closeModal() {
    $('#recipe-modal').hide();
}

// סינון מתכונים לפי עונה
function filterRecipesBySeason() {
    if (currentSeason === 'all') {
        filteredRecipes = [...allRecipes];
    } else {
        filteredRecipes = allRecipes.filter(recipe => 
            recipe.season === currentSeason || recipe.season === 'כל השנה'
        );
    }
    
    // החלת סינון גיל נוסף אם קיים
    if (currentAgeFilter !== 'all') {
        filterRecipesByAge();
    } else {
        displayRecipes();
        updateStats();
    }
}

// סינון מתכונים לפי גיל
function filterRecipesByAge() {
    let recipesToFilter = currentSeason === 'all' ? allRecipes : 
        allRecipes.filter(recipe => recipe.season === currentSeason || recipe.season === 'כל השנה');
    
    if (currentAgeFilter === 'all') {
        filteredRecipes = recipesToFilter;
    } else {
        filteredRecipes = recipesToFilter.filter(recipe => {
            const ageRange = recipe.age_range.toLowerCase();
            switch(currentAgeFilter) {
                case '1-2':
                    return ageRange.includes('1') || ageRange.includes('2');
                case '1-3':
                    return ageRange.includes('1') || ageRange.includes('2') || ageRange.includes('3');
                case '2-5':
                    return ageRange.includes('2') || ageRange.includes('3') || ageRange.includes('4') || ageRange.includes('5');
                case '3-8':
                    return ageRange.includes('3') || ageRange.includes('4') || ageRange.includes('5') || 
                           ageRange.includes('6') || ageRange.includes('7') || ageRange.includes('8');
                case '5-12':
                    return ageRange.includes('5') || ageRange.includes('6') || ageRange.includes('7') || 
                           ageRange.includes('8') || ageRange.includes('9') || ageRange.includes('10') ||
                           ageRange.includes('11') || ageRange.includes('12') || ageRange.includes('בוגר');
                default:
                    return true;
            }
        });
    }
    
    displayRecipes();
    updateStats();
}

// עדכון סטטיסטיקות
function updateStats() {
    const totalRecipes = allRecipes.length;
    const visibleRecipes = filteredRecipes.length;
    
    $('#total-recipes').text(totalRecipes);
    $('#visible-recipes').text(visibleRecipes);
}

// הצגת הודעת "אין תוצאות"
function toggleNoResultsMessage() {
    const hasResults = filteredRecipes.length > 0;
    
    if (hasResults) {
        $('#no-results').hide();
    } else {
        if (!$('#no-results').length) {
            $('#recipes-container').append(`
                <div id="no-results" class="no-results">
                    <h3>לא נמצאו תוצאות</h3>
                    <p>נסה לשנות את הפילטרים או את מילות החיפוש</p>
                </div>
            `);
        }
        $('#no-results').show();
    }
}

// הצגת שגיאה
function showError(message) {
    const errorDiv = $(`
        <div class="error-message">
            <p>${message}</p>
            <button onclick="$(this).parent().remove()">סגור</button>
        </div>
    `);
    
    $('body').append(errorDiv);
    
    setTimeout(() => {
        errorDiv.fadeOut(() => errorDiv.remove());
    }, 5000);
}

// הצגת כפתור חזרה למעלה
function showBackToTop() {
    $(window).scroll(function() {
        if ($(this).scrollTop() > 300) {
            $('#back-to-top').fadeIn();
        } else {
            $('#back-to-top').fadeOut();
        }
    });
    
    $('#back-to-top').click(function() {
        $('html, body').animate({scrollTop: 0}, 600);
    });
}

// פונקציות עזר נוספות

// בדיקה אם המרכיב מכיל גלוטן
function isGlutenFree(ingredientName) {
    const glutenIngredients = ['קמח', 'לחם', 'פסטה', 'שיבולת שועל', 'שעורה', 'כוסמין'];
    return !glutenIngredients.some(gluten => ingredientName.includes(gluten));
}

// קבלת עונה נוכחית
function getCurrentSeason() {
    const month = new Date().getMonth() + 1; // JavaScript months are 0-indexed
    
    if (month >= 3 && month <= 5) return 'אביב';
    if (month >= 6 && month <= 8) return 'קיץ';
    if (month >= 9 && month <= 11) return 'סתיו';
    return 'חורף';
}

// המלצה על מתכונים לפי עונה
function recommendSeasonalRecipes() {
    const currentSeason = getCurrentSeason();
    return allRecipes.filter(recipe => 
        recipe.season === currentSeason || recipe.season === 'כל השנה'
    ).slice(0, 5);
}

// פונקציות מתכון חירום רנדומלי
let currentEmergencyIndex = 0;
let emergencyRecipes = [];

// אתחול מתכוני חירום
function initializeEmergencyRecipes() {
    emergencyRecipes = allRecipes.filter(recipe => 
        recipe.categoryKey === 'ארוחת_חירום_לגן' ||
        (recipe.prep_time && (
            recipe.prep_time.includes('5 ד') || 
            recipe.prep_time.includes('10 ד') || 
            recipe.prep_time.includes('15 ד') ||
            recipe.prep_time.includes('מיידי')
        ))
    );
    
    // מיון לפי זמן הכנה ואחר כך קושי
    emergencyRecipes.sort((a, b) => {
        const getMinutes = (time) => {
            if (time.includes('מיידי')) return 0;
            const match = time.match(/(\d+)/);
            return match ? parseInt(match[1]) : 20;
        };
        
        const timeA = getMinutes(a.prep_time || '20 דקות');
        const timeB = getMinutes(b.prep_time || '20 דקות');
        
        if (timeA !== timeB) return timeA - timeB;
        
        const difficultyOrder = {'קל': 1, 'בינוני': 2, 'קשה': 3};
        return (difficultyOrder[a.difficulty] || 2) - (difficultyOrder[b.difficulty] || 2);
    });
    
    if (emergencyRecipes.length > 0) {
        updateEmergencyCounter();
        displayEmergencyRecipe(0);
    }
}

// הצגת מתכון חירום
function displayEmergencyRecipe(index) {
    if (!emergencyRecipes.length) return;
    
    currentEmergencyIndex = index;
    const recipe = emergencyRecipes[index];
    
    const emergencyDisplay = $('#emergencyRecipeDisplay');
    emergencyDisplay.html(`
        <div class="emergency-recipe-card">
            <h4>${recipe.name}</h4>
            <div class="emergency-meta">
                <span class="age">👶 ${recipe.age_range}</span>
                <span class="time">⏰ ${recipe.prep_time}</span>
                <span class="difficulty">${recipe.difficulty}</span>
            </div>
            <div class="emergency-ingredients">
                <strong>מצרכים:</strong> ${recipe.ingredients.slice(0, 3).join(', ')}
                ${recipe.ingredients.length > 3 ? '...' : ''}
            </div>
            <div class="emergency-instructions">
                <strong>הכנה:</strong> ${recipe.instructions.length > 100 ? 
                    recipe.instructions.substring(0, 100) + '...' : 
                    recipe.instructions}
            </div>
            <button class="view-full-recipe" data-recipe-id="${recipe.id}">
                📖 צפה במתכון המלא
            </button>
        </div>
    `);
    
    updateEmergencyCounter();
}

// עדכון מונה מתכוני חירום
function updateEmergencyCounter() {
    const counter = $('#currentEmergencyIndex');
    counter.text(`${currentEmergencyIndex + 1} / ${emergencyRecipes.length}`);
}

// מתכון חירום רנדומלי
function showRandomEmergencyRecipe() {
    if (!emergencyRecipes.length) return;
    
    const randomIndex = Math.floor(Math.random() * emergencyRecipes.length);
    displayEmergencyRecipe(randomIndex);
}

// מתכון חירום הבא
function showNextEmergencyRecipe() {
    if (!emergencyRecipes.length) return;
    
    const nextIndex = (currentEmergencyIndex + 1) % emergencyRecipes.length;
    displayEmergencyRecipe(nextIndex);
}

// מתכון חירום קודם
function showPrevEmergencyRecipe() {
    if (!emergencyRecipes.length) return;
    
    const prevIndex = currentEmergencyIndex === 0 ? 
        emergencyRecipes.length - 1 : 
        currentEmergencyIndex - 1;
    displayEmergencyRecipe(prevIndex);
    
}
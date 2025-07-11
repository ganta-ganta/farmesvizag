// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA6ShFd_7VAHtkRUg9k6YEvNSXqKMRvuic",
    authDomain: "framesvizag.firebaseapp.com",
    databaseURL: "https://framesvizag-default-rtdb.firebaseio.com",
    projectId: "framesvizag",
    storageBucket: "framesvizag.appspot.com",
    messagingSenderId: "128117311675",
    appId: "1:128117311675:web:8a817b1efb0c0e7bfb419e",
    measurementId: "G-0EKRGC9748"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.getAuth(app);
const db = firebase.getDatabase(app);
const storage = firebase.getStorage(app);

// Global Variables
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
const ADMIN_EMAIL = "admin@gantasolutions.com";

// DOM Elements
const loginLink = document.getElementById('loginLink');
const registerLink = document.getElementById('registerLink');
const logoutLink = document.getElementById('logoutLink');
const adminLink = document.getElementById('adminLink');
const cartLink = document.getElementById('cartLink');
const cartCount = document.getElementById('cartCount');
const homeLink = document.getElementById('homeLink');
const productsLink = document.getElementById('productsLink');
const whatsappCatalogLink = document.getElementById('whatsappCatalogLink');
const mainContent = document.getElementById('mainContent');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

// Initialize Modals
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
const forgotPasswordModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    checkAuthState();
    loadHomePage();
});

loginLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.show();
});

registerLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerModal.show();
});

logoutLink.addEventListener('click', (e) => {
    e.preventDefault();
    firebase.signOut(auth).then(() => {
        alert('Logged out successfully');
        checkAuthState();
    }).catch(error => {
        alert('Error logging out: ' + error.message);
    });
});

adminLink.addEventListener('click', (e) => {
    e.preventDefault();
    loadAdminDashboard();
});

homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    loadHomePage();
});

productsLink.addEventListener('click', (e) => {
    e.preventDefault();
    loadProductsPage();
});

whatsappCatalogLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.open('https://wa.me/c/917095615567', '_blank');
});

forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.hide();
    forgotPasswordModal.show();
});

// Login Form Submission
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    firebase.signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            loginModal.hide();
            checkAuthState();
        })
        .catch((error) => {
            alert('Login error: ' + error.message);
        });
});

// Register Form Submission
document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    firebase.createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Save additional user data
            return firebase.set(firebase.ref(db, 'users/' + userCredential.user.uid), {
                name: name,
                email: email,
                phone: phone,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
        })
        .then(() => {
            registerModal.hide();
            alert('Registration successful! Please login.');
        })
        .catch((error) => {
            alert('Registration error: ' + error.message);
        });
});

// Forgot Password Form Submission
document.getElementById('forgotPasswordForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;
    
    firebase.sendPasswordResetEmail(auth, email)
        .then(() => {
            alert('Password reset email sent. Please check your inbox.');
            forgotPasswordModal.hide();
        })
        .catch((error) => {
            alert('Error sending reset email: ' + error.message);
        });
});

// Functions
function checkAuthState() {
    firebase.onAuthStateChanged(auth, (user) => {
        currentUser = user;
        
        if (user) {
            // User is logged in
            loginLink.style.display = 'none';
            registerLink.style.display = 'none';
            logoutLink.style.display = 'block';
            
            // Check if admin
            if (user.email === ADMIN_EMAIL) {
                adminLink.style.display = 'block';
            } else {
                adminLink.style.display = 'none';
            }
        } else {
            // User is logged out
            loginLink.style.display = 'block';
            registerLink.style.display = 'block';
            logoutLink.style.display = 'none';
            adminLink.style.display = 'none';
        }
    });
}

function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = count;
}

function loadHomePage() {
    mainContent.innerHTML = `
        <div class="row">
            <div class="col-md-6 mx-auto text-center py-5">
                <h1>Welcome to Frames Vizag</h1>
                <p class="lead">Custom photo frames made with love in Visakhapatnam</p>
                <div class="mt-4">
                    <button class="btn btn-primary btn-lg me-2" id="browseProductsBtn">Browse Products</button>
                    <button class="btn btn-success btn-lg whatsapp-catalog-btn" id="whatsappBtn">View WhatsApp Catalog</button>
                </div>
            </div>
        </div>
        <div class="row mt-5">
            <div class="col-md-8 mx-auto">
                <h2 class="text-center mb-4">Featured Products</h2>
                <div class="row" id="featuredProducts">
                    <!-- Featured products will be loaded here -->
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('browseProductsBtn').addEventListener('click', loadProductsPage);
    document.getElementById('whatsappBtn').addEventListener('click', () => {
        window.open('https://wa.me/c/917095615567', '_blank');
    });
    
    // Load 4 random featured products
    firebase.get(firebase.ref(db, 'products')).then((snapshot) => {
        const products = snapshot.val();
        if (products) {
            const productArray = Object.entries(products)
                .filter(([id, product]) => product.active)
                .map(([id, product]) => ({ id, ...product }));
            
            // Shuffle and take 4
            const featured = productArray.sort(() => 0.5 - Math.random()).slice(0, 4);
            
            const featuredContainer = document.getElementById('featuredProducts');
            featured.forEach(product => {
                featuredContainer.innerHTML += `
                    <div class="col-md-3 mb-4">
                        <div class="card product-card h-100">
                            <img src="${product.images?.[0] || 'images/placeholder.jpg'}" class="card-img-top" alt="${product.name}">
                            <div class="card-body">
                                <h5 class="card-title">${product.name}</h5>
                                <p class="card-text">₹${product.price}</p>
                                <button class="btn btn-sm btn-outline-primary view-product" data-id="${product.id}">View</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            // Add event listeners to view buttons
            document.querySelectorAll('.view-product').forEach(button => {
                button.addEventListener('click', (e) => {
                    const productId = e.target.getAttribute('data-id');
                    loadProductDetailPage(productId);
                });
            });
        }
    });
}

function loadProductsPage() {
    mainContent.innerHTML = `
        <div class="row">
            <div class="col-12">
                <h2>Our Products</h2>
                <div class="row mb-3">
                    <div class="col-md-4">
                        <input type="text" class="form-control" id="productSearch" placeholder="Search products...">
                    </div>
                    <div class="col-md-4">
                        <select class="form-select" id="categoryFilter">
                            <option value="">All Categories</option>
                            <option value="wooden">Wooden Frames</option>
                            <option value="digital">Digital Frames</option>
                            <option value="collage">Collage Frames</option>
                        </select>
                    </div>
                </div>
                <div class="row" id="productsContainer">
                    <!-- Products will be loaded here -->
                </div>
            </div>
        </div>
    `;
    
    const searchInput = document.getElementById('productSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    
    const loadProducts = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const category = categoryFilter.value;
        
        firebase.get(firebase.ref(db, 'products')).then((snapshot) => {
            const products = snapshot.val();
            const productsContainer = document.getElementById('productsContainer');
            productsContainer.innerHTML = '';
            
            if (products) {
                Object.entries(products).forEach(([id, product]) => {
                    if (!product.active) return;
                    if (category && product.category !== category) return;
                    if (searchTerm && !product.name.toLowerCase().includes(searchTerm)) return;
                    
                    productsContainer.innerHTML += `
                        <div class="col-md-4 mb-4">
                            <div class="card product-card h-100">
                                <img src="${product.images?.[0] || 'images/placeholder.jpg'}" class="card-img-top" alt="${product.name}">
                                <div class="card-body">
                                    <h5 class="card-title">${product.name}</h5>
                                    <p class="card-text">₹${product.price}</p>
                                    <p class="card-text"><small class="text-muted">${product.sizes?.join(', ') || 'One size'}</small></p>
                                    <button class="btn btn-sm btn-outline-primary view-product" data-id="${id}">View Details</button>
                                    <button class="btn btn-sm btn-primary add-to-cart" data-id="${id}">Add to Cart</button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                // Add event listeners
                document.querySelectorAll('.view-product').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const productId = e.target.getAttribute('data-id');
                        loadProductDetailPage(productId);
                    });
                });
                
                document.querySelectorAll('.add-to-cart').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const productId = e.target.getAttribute('data-id');
                        addToCart(productId);
                    });
                });
            } else {
                productsContainer.innerHTML = '<p class="text-center">No products found.</p>';
            }
        });
    };
    
    // Initial load
    loadProducts();
    
    // Add event listeners for filtering
    searchInput.addEventListener('input', loadProducts);
    categoryFilter.addEventListener('change', loadProducts);
}

function loadProductDetailPage(productId) {
    firebase.get(firebase.ref(db, `products/${productId}`)).then((snapshot) => {
        const product = snapshot.val();
        
        if (!product) {
            mainContent.innerHTML = '<div class="alert alert-danger">Product not found</div>';
            return;
        }
        
        mainContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <img src="${product.images?.[0] || 'images/placeholder.jpg'}" class="img-fluid rounded" alt="${product.name}">
                    <div class="row mt-3">
                        ${product.images?.slice(1).map(img => `
                            <div class="col-3">
                                <img src="${img}" class="img-thumbnail" style="cursor:pointer" onclick="document.querySelector('.img-fluid').src='${img}'">
                            </div>
                        `).join('') || ''}
                    </div>
                </div>
                <div class="col-md-6">
                    <h2>${product.name}</h2>
                    <p class="text-muted">${product.category ? product.category.charAt(0).toUpperCase() + product.category.slice(1) : ''} Frame</p>
                    <h3 class="my-3">₹${product.price}</h3>
                    <p>${product.description || 'No description available.'}</p>
                    
                    ${product.sizes ? `
                        <div class="mb-3">
                            <label class="form-label">Select Size:</label>
                            <select class="form-select" id="sizeSelect">
                                ${product.sizes.map(size => `<option value="${size}">${size}</option>`).join('')}
                            </select>
                        </div>
                    ` : ''}
                    
                    <div class="mb-3">
                        <label class="form-label">Quantity:</label>
                        <input type="number" class="form-control" id="quantityInput" min="1" value="1" style="width: 80px;">
                    </div>
                    
                    <button class="btn btn-primary btn-lg" id="addToCartBtn">Add to Cart</button>
                    <button class="btn btn-outline-secondary btn-lg ms-2" id="backToProductsBtn">Back to Products</button>
                    
                    ${product.whatsappCatalog ? `
                        <div class="mt-3">
                            <button class="btn btn-success whatsapp-catalog-btn" id="shareWhatsAppBtn">
                                <i class="fab fa-whatsapp"></i> Share via WhatsApp
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.getElementById('addToCartBtn').addEventListener('click', () => {
            const quantity = parseInt(document.getElementById('quantityInput').value);
            const size = document.getElementById('sizeSelect')?.value || 'One size';
            addToCart(productId, quantity, size);
        });
        
        document.getElementById('backToProductsBtn').addEventListener('click', loadProductsPage);
        
        if (product.whatsappCatalog) {
            document.getElementById('shareWhatsAppBtn').addEventListener('click', () => {
                const message = `Check out this product: ${product.name}\nPrice: ₹${product.price}\n${window.location.origin}/product/${productId}`;
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            });
        }
    });
}

function addToCart(productId, quantity = 1, size = 'One size') {
    firebase.get(firebase.ref(db, `products/${productId}`)).then((snapshot) => {
        const product = snapshot.val();
        
        if (!product) {
            alert('Product not found');
            return;
        }
        
        // Check if product already in cart
        const existingItemIndex = cart.findIndex(item => item.id === productId && item.size === size);
        
        if (existingItemIndex >= 0) {
            // Update quantity
            cart[existingItemIndex].quantity += quantity;
        } else {
            // Add new item
            cart.push({
                id: productId,
                name: product.name,
                price: product.price,
                image: product.images?.[0] || 'images/placeholder.jpg',
                size: size,
                quantity: quantity
            });
        }
        
        // Save to localStorage
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        
        alert('Product added to cart!');
    });
}

function loadCartPage() {
    mainContent.innerHTML = `
        <div class="row">
            <div class="col-md-8">
                <h2>Your Cart</h2>
                ${cart.length === 0 ? `
                    <div class="alert alert-info">Your cart is empty</div>
                    <button class="btn btn-primary" id="continueShoppingBtn">Continue Shopping</button>
                ` : `
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Size</th>
                                    <th>Price</th>
                                    <th>Quantity</th>
                                    <th>Total</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="cartItems">
                                <!-- Cart items will be loaded here -->
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="4" class="text-end"><strong>Subtotal:</strong></td>
                                    <td id="cartSubtotal">₹0</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td colspan="4" class="text-end"><strong>Discount:</strong></td>
                                    <td id="cartDiscount">-₹0</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td colspan="4" class="text-end"><strong>Total:</strong></td>
                                    <td id="cartTotal">₹0</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <input type="text" class="form-control" id="couponCode" placeholder="Enter coupon code">
                            <button class="btn btn-sm btn-outline-success mt-2" id="applyCouponBtn">Apply Coupon</button>
                            <span id="couponMessage" class="ms-2"></span>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary btn-lg" id="checkoutBtn">Proceed to Checkout</button>
                    <button class="btn btn-outline-secondary btn-lg ms-2" id="continueShoppingBtn">Continue Shopping</button>
                `}
            </div>
        </div>
    `;
    
    if (cart.length > 0) {
        const cartItemsContainer = document.getElementById('cartItems');
        let subtotal = 0;
        
        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            
            cartItemsContainer.innerHTML += `
                <tr>
                    <td>
                        <img src="${item.image}" width="50" class="me-2">
                        ${item.name}
                    </td>
                    <td>${item.size}</td>
                    <td>₹${item.price}</td>
                    <td>
                        <input type="number" min="1" value="${item.quantity}" 
                               class="form-control form-control-sm quantity-input" 
                               style="width: 70px;"
                               data-index="${index}">
                    </td>
                    <td>₹${itemTotal}</td>
                    <td>
                        <button class="btn btn-sm btn-danger remove-item" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        document.getElementById('cartSubtotal').textContent = `₹${subtotal.toFixed(2)}`;
        document.getElementById('cartTotal').textContent = `₹${subtotal.toFixed(2)}`;
        
        // Add event listeners
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                const newQuantity = parseInt(e.target.value);
                
                if (newQuantity > 0) {
                    cart[index].quantity = newQuantity;
                    localStorage.setItem('cart', JSON.stringify(cart));
                    loadCartPage(); // Refresh cart view
                }
            });
        });
        
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('button').getAttribute('data-index'));
                cart.splice(index, 1);
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartCount();
                loadCartPage(); // Refresh cart view
            });
        });
        
        document.getElementById('applyCouponBtn').addEventListener('click', () => {
            const couponCode = document.getElementById('couponCode').value;
            if (!couponCode) {
                document.getElementById('couponMessage').textContent = 'Please enter a coupon code';
                document.getElementById('couponMessage').className = 'ms-2 text-danger';
                return;
            }
            
            // In a real app, you would validate the coupon with Firebase
            // For now, we'll just simulate a 10% discount
            document.getElementById('couponMessage').textContent = 'Coupon applied: 10% off';
            document.getElementById('couponMessage').className = 'ms-2 text-success';
            
            const discount = subtotal * 0.1;
            document.getElementById('cartDiscount').textContent = `-₹${discount.toFixed(2)}`;
            document.getElementById('cartTotal').textContent = `₹${(subtotal - discount).toFixed(2)}`;
        });
        
        document.getElementById('checkoutBtn').addEventListener('click', () => {
            if (!currentUser) {
                alert('Please login to proceed to checkout');
                loginModal.show();
                return;
            }
            loadCheckoutPage();
        });
    }
    
    document.getElementById('continueShoppingBtn').addEventListener('click', loadProductsPage);
}

function loadCheckoutPage() {
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = 0; // Would come from coupon if applied
    const total = subtotal - discount;
    
    // Get user addresses
    firebase.get(firebase.ref(db, `users/${currentUser.uid}/addresses`)).then((snapshot) => {
        const addresses = snapshot.val() || {};
        const addressList = Object.entries(addresses).map(([id, address]) => ({ id, ...address }));
        
        mainContent.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h2>Checkout</h2>
                    
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5>Delivery Address</h5>
                        </div>
                        <div class="card-body">
                            ${addressList.length > 0 ? `
                                <div class="row" id="addressSelection">
                                    ${addressList.map(address => `
                                        <div class="col-md-6 mb-3">
                                            <div class="card ${address.isDefault ? 'border-primary' : ''}">
                                                <div class="card-body">
                                                    <h6>${address.isDefault ? 'Default Address' : 'Address'}</h6>
                                                    <p>
                                                        ${address.street}<br>
                                                        ${address.city}, ${address.state}<br>
                                                        ${address.zip}
                                                    </p>
                                                    <button class="btn btn-sm ${address.isDefault ? 'btn-primary' : 'btn-outline-primary'} select-address" 
                                                            data-id="${address.id}">
                                                        ${address.isDefault ? 'Selected' : 'Select'}
                                                    </button>
                                                    ${!address.isDefault && `
                                                        <button class="btn btn-sm btn-outline-secondary ms-2 set-default-address" 
                                                                data-id="${address.id}">
                                                            Set as Default
                                                        </button>
                                                    `}
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <p>No addresses saved. Please add a delivery address.</p>
                            `}
                            
                            <button class="btn btn-outline-primary" id="addNewAddressBtn">
                                <i class="fas fa-plus"></i> Add New Address
                            </button>
                        </div>
                    </div>
                    
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5>Order Summary</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Size</th>
                                            <th>Price</th>
                                            <th>Quantity</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${cart.map(item => `
                                            <tr>
                                                <td>${item.name}</td>
                                                <td>${item.size}</td>
                                                <td>₹${item.price}</td>
                                                <td>${item.quantity}</td>
                                                <td>₹${(item.price * item.quantity).toFixed(2)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="4" class="text-end"><strong>Subtotal:</strong></td>
                                            <td>₹${subtotal.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td colspan="4" class="text-end"><strong>Discount:</strong></td>
                                            <td>-₹${discount.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td colspan="4" class="text-end"><strong>Total:</strong></td>
                                            <td>₹${total.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h5>Payment Method</h5>
                        </div>
                        <div class="card-body">
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="radio" name="paymentMethod" id="upiPayment" value="upi" checked>
                                <label class="form-check-label" for="upiPayment">
                                    UPI Payment
                                </label>
                            </div>
                            <div id="upiDetails" class="mb-3">
                                <p>Please transfer to:</p>
                                <p><strong>UPI ID:</strong> framesvizag@upi</p>
                                <p><strong>PhonePe Number:</strong> 7095615567</p>
                                <div class="mb-3">
                                    <label for="transactionId" class="form-label">Transaction ID/Reference</label>
                                    <input type="text" class="form-control" id="transactionId" required>
                                </div>
                            </div>
                            
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="radio" name="paymentMethod" id="bankTransfer" value="bank_transfer">
                                <label class="form-check-label" for="bankTransfer">
                                    Bank Transfer
                                </label>
                            </div>
                            <div id="bankDetails" class="mb-3" style="display:none;">
                                <p>Please transfer to:</p>
                                <p><strong>Bank Name:</strong> State Bank of India</p>
                                <p><strong>Account Name:</strong> Frames Vizag</p>
                                <p><strong>Account Number:</strong> 1234567890</p>
                                <p><strong>IFSC Code:</strong> SBIN0001234</p>
                                <div class="mb-3">
                                    <label for="bankTransactionId" class="form-label">Transaction ID/Reference</label>
                                    <input type="text" class="form-control" id="bankTransactionId">
                                </div>
                            </div>
                            
                            <button class="btn btn-primary btn-lg w-100" id="placeOrderBtn">Place Order</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- New Address Modal -->
            <div class="modal fade" id="newAddressModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Add New Address</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="newAddressForm">
                                <div class="mb-3">
                                    <label for="addressStreet" class="form-label">Street Address</label>
                                    <input type="text" class="form-control" id="addressStreet" required>
                                </div>
                                <div class="mb-3">
                                    <label for="addressCity" class="form-label">City</label>
                                    <input type="text" class="form-control" id="addressCity" required>
                                </div>
                                <div class="mb-3">
                                    <label for="addressState" class="form-label">State</label>
                                    <input type="text" class="form-control" id="addressState" required>
                                </div>
                                <div class="mb-3">
                                    <label for="addressZip" class="form-label">ZIP Code</label>
                                    <input type="text" class="form-control" id="addressZip" required>
                                </div>
                                <div class="mb-3 form-check">
                                    <input type="checkbox" class="form-check-input" id="addressDefault">
                                    <label class="form-check-label" for="addressDefault">Set as default address</label>
                                </div>
                                <button type="submit" class="btn btn-primary">Save Address</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Set up payment method toggle
        document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.getElementById('upiDetails').style.display = 
                    e.target.value === 'upi' ? 'block' : 'none';
                document.getElementById('bankDetails').style.display = 
                    e.target.value === 'bank_transfer' ? 'block' : 'none';
            });
        });
        
        // Set up address selection
        document.querySelectorAll('.select-address').forEach(button => {
            button.addEventListener('click', (e) => {
                const addressId = e.target.getAttribute('data-id');
                // In a real app, you would store the selected address for the order
                e.target.classList.remove('btn-outline-primary');
                e.target.classList.add('btn-primary');
                e.target.textContent = 'Selected';
                
                // Reset other buttons
                document.querySelectorAll('.select-address').forEach(btn => {
                    if (btn !== e.target) {
                        btn.classList.remove('btn-primary');
                        btn.classList.add('btn-outline-primary');
                        btn.textContent = 'Select';
                    }
                });
            });
        });
        
        // Set default address
        document.querySelectorAll('.set-default-address').forEach(button => {
            button.addEventListener('click', async (e) => {
                const addressId = e.target.getAttribute('data-id');
                
                // First, remove default from all addresses
                const updates = {};
                Object.keys(addresses).forEach(id => {
                    updates[`users/${currentUser.uid}/addresses/${id}/isDefault`] = false;
                });
                
                // Then set the selected one as default
                updates[`users/${currentUser.uid}/addresses/${addressId}/isDefault`] = true;
                
                try {
                    await firebase.update(firebase.ref(db), updates);
                    alert('Default address updated');
                    loadCheckoutPage(); // Refresh the view
                } catch (error) {
                    alert('Error updating address: ' + error.message);
                }
            });
        });
        
        // Add new address
        document.getElementById('addNewAddressBtn').addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('newAddressModal'));
            modal.show();
        });
        
        // New address form submission
        document.getElementById('newAddressForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newAddress = {
                street: document.getElementById('addressStreet').value,
                city: document.getElementById('addressCity').value,
                state: document.getElementById('addressState').value,
                zip: document.getElementById('addressZip').value,
                isDefault: document.getElementById('addressDefault').checked
            };
            
            try {
                // If setting as default, first remove default from others
                if (newAddress.isDefault) {
                    const updates = {};
                    Object.keys(addresses).forEach(id => {
                        updates[`users/${currentUser.uid}/addresses/${id}/isDefault`] = false;
                    });
                    await firebase.update(firebase.ref(db), updates);
                }
                
                // Add new address
                const newAddressRef = firebase.push(firebase.ref(db, `users/${currentUser.uid}/addresses`));
                await firebase.set(newAddressRef, newAddress);
                
                alert('Address added successfully');
                bootstrap.Modal.getInstance(document.getElementById('newAddressModal')).hide();
                loadCheckoutPage(); // Refresh the view
            } catch (error) {
                alert('Error adding address: ' + error.message);
            }
        });
        
        // Place order
        document.getElementById('placeOrderBtn').addEventListener('click', async () => {
            // Validate address selection
            const selectedAddress = document.querySelector('.select-address.btn-primary');
            if (!selectedAddress && addressList.length > 0) {
                alert('Please select a delivery address');
                return;
            }
            
            const addressId = selectedAddress?.getAttribute('data-id') || null;
            
            // Validate payment
            const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
            const transactionId = paymentMethod === 'upi' 
                ? document.getElementById('transactionId').value
                : document.getElementById('bankTransactionId').value;
            
            if (!transactionId) {
                alert('Please enter your transaction ID/reference');
                return;
            }
            
            // Prepare order data
            const orderData = {
                userId: currentUser.uid,
                items: cart.reduce((obj, item) => {
                    obj[item.id] = {
                        quantity: item.quantity,
                        price: item.price,
                        size: item.size
                    };
                    return obj;
                }, {}),
                total: subtotal,
                discount: discount,
                finalTotal: total,
                status: 'pending',
                shippingAddress: addressId,
                payment: {
                    method: paymentMethod,
                    transactionId: transactionId,
                    status: 'pending',
                    amount: total
                },
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            try {
                // Create order
                const newOrderRef = firebase.push(firebase.ref(db, 'orders'));
                await firebase.set(newOrderRef, orderData);
                
                // Clear cart
                cart = [];
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartCount();
                
                alert('Order placed successfully! Your order ID is: ' + newOrderRef.key);
                loadOrderConfirmationPage(newOrderRef.key);
            } catch (error) {
                alert('Error placing order: ' + error.message);
            }
        });
    });
}

function loadOrderConfirmationPage(orderId) {
    firebase.get(firebase.ref(db, `orders/${orderId}`)).then((snapshot) => {
        const order = snapshot.val();
        
        if (!order) {
            mainContent.innerHTML = '<div class="alert alert-danger">Order not found</div>';
            return;
        }
        
        // Get user info
        firebase.get(firebase.ref(db, `users/${order.userId}`)).then((userSnapshot) => {
            const user = userSnapshot.val();
            
            // Get address
            firebase.get(firebase.ref(db, `users/${order.userId}/addresses/${order.shippingAddress}`)).then((addressSnapshot) => {
                const address = addressSnapshot.val();
                
                // Get product details for each item
                const productPromises = Object.keys(order.items).map(productId => {
                    return firebase.get(firebase.ref(db, `products/${productId}`)).then(productSnapshot => {
                        return {
                            id: productId,
                            ...productSnapshot.val(),
                            ...order.items[productId]
                        };
                    });
                });
                
                Promise.all(productPromises).then(products => {
                    mainContent.innerHTML = `
                        <div class="row">
                            <div class="col-md-8 mx-auto">
                                <div class="card">
                                    <div class="card-header bg-success text-white">
                                        <h3 class="mb-0">Order Confirmation</h3>
                                    </div>
                                    <div class="card-body">
                                        <div class="alert alert-success">
                                            <h4 class="alert-heading">Thank you for your order!</h4>
                                            <p>Your order #${orderId} has been received and is being processed.</p>
                                        </div>
                                        
                                        <div class="row">
                                            <div class="col-md-6">
                                                <h5>Order Details</h5>
                                                <p><strong>Order ID:</strong> ${orderId}</p>
                                                <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                                                <p><strong>Status:</strong> <span class="order-status ${getStatusClass(order.status)}">${formatStatus(order.status)}</span></p>
                                                <p><strong>Payment Method:</strong> ${formatPaymentMethod(order.payment.method)}</p>
                                                <p><strong>Payment Status:</strong> ${order.payment.status}</p>
                                                <p><strong>Transaction ID:</strong> ${order.payment.transactionId}</p>
                                            </div>
                                            <div class="col-md-6">
                                                <h5>Customer Details</h5>
                                                <p><strong>Name:</strong> ${user.name}</p>
                                                <p><strong>Email:</strong> ${user.email}</p>
                                                <p><strong>Phone:</strong> ${user.phone}</p>
                                            </div>
                                        </div>
                                        
                                        <div class="mt-4">
                                            <h5>Delivery Address</h5>
                                            <p>
                                                ${address.street}<br>
                                                ${address.city}, ${address.state}<br>
                                                ${address.zip}
                                            </p>
                                        </div>
                                        
                                        <div class="mt-4">
                                            <h5>Order Items</h5>
                                            <div class="table-responsive">
                                                <table class="table">
                                                    <thead>
                                                        <tr>
                                                            <th>Product</th>
                                                            <th>Size</th>
                                                            <th>Price</th>
                                                            <th>Quantity</th>
                                                            <th>Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${products.map(product => `
                                                            <tr>
                                                                <td>${product.name}</td>
                                                                <td>${product.size}</td>
                                                                <td>₹${product.price}</td>
                                                                <td>${product.quantity}</td>
                                                                <td>₹${(product.price * product.quantity).toFixed(2)}</td>
                                                            </tr>
                                                        `).join('')}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr>
                                                            <td colspan="4" class="text-end"><strong>Subtotal:</strong></td>
                                                            <td>₹${order.total.toFixed(2)}</td>
                                                        </tr>
                                                        <tr>
                                                            <td colspan="4" class="text-end"><strong>Discount:</strong></td>
                                                            <td>-₹${order.discount?.toFixed(2) || '0.00'}</td>
                                                        </tr>
                                                        <tr>
                                                            <td colspan="4" class="text-end"><strong>Total:</strong></td>
                                                            <td>₹${order.finalTotal.toFixed(2)}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                        
                                        <div class="mt-4">
                                            <button class="btn btn-primary" id="trackOrderBtn" data-id="${orderId}">Track Your Order</button>
                                            <button class="btn btn-outline-secondary ms-2" id="continueShoppingBtn">Continue Shopping</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    document.getElementById('trackOrderBtn').addEventListener('click', (e) => {
                        const orderId = e.target.getAttribute('data-id');
                        loadOrderTrackingPage(orderId);
                    });
                    
                    document.getElementById('continueShoppingBtn').addEventListener('click', loadProductsPage);
                });
            });
        });
    });
}

function loadOrderTrackingPage(orderId) {
    firebase.get(firebase.ref(db, `orders/${orderId}`)).then((snapshot) => {
        const order = snapshot.val();
        
        if (!order) {
            mainContent.innerHTML = '<div class="alert alert-danger">Order not found</div>';
            return;
        }
        
        // Get product details for each item
        const productPromises = Object.keys(order.items).map(productId => {
            return firebase.get(firebase.ref(db, `products/${productId}`)).then(productSnapshot => {
                return {
                    id: productId,
                    ...productSnapshot.val(),
                    ...order.items[productId]
                };
            });
        });
        
        Promise.all(productPromises).then(products => {
            const statusSteps = [
                { id: 'pending', label: 'Order Placed' },
                { id: 'processing', label: 'Processing' },
                { id: 'production', label: 'In Production' },
                { id: 'ready', label: 'Ready for Shipping' },
                { id: 'shipped', label: 'Shipped' },
                { id: 'delivered', label: 'Delivered' }
            ];
            
            const currentStatusIndex = statusSteps.findIndex(step => step.id === order.status);
            
            mainContent.innerHTML = `
                <div class="row">
                    <div class="col-md-8 mx-auto">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="mb-0">Order Tracking - #${orderId}</h3>
                            </div>
                            <div class="card-body">
                                <div class="order-status-tracker mb-5">
                                    <div class="steps">
                                        ${statusSteps.map((step, index) => `
                                            <div class="step ${index <= currentStatusIndex ? 'active' : ''} 
                                                ${index === currentStatusIndex ? 'current' : ''}">
                                                <div class="step-icon">
                                                    <i class="fas ${getStatusIcon(step.id)}"></i>
                                                </div>
                                                <div class="step-label">${step.label}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                
                                <div class="alert alert-${getStatusAlertClass(order.status)}">
                                    <h5 class="alert-heading">Current Status: ${formatStatus(order.status)}</h5>
                                    <p>${getStatusDescription(order.status)}</p>
                                    ${order.status === 'delivered' && order.updatedAt ? `
                                        <p>Delivered on: ${new Date(order.updatedAt).toLocaleString()}</p>
                                    ` : ''}
                                </div>
                                
                                ${order.status === 'production' || order.status === 'ready' ? `
                                    <div class="completion-photos mb-4">
                                        <h5>Frame Completion Photos</h5>
                                        ${order.completionPhotos?.length > 0 ? `
                                            <div class="row">
                                                ${order.completionPhotos.map(photo => `
                                                    <div class="col-md-3 mb-3">
                                                        <img src="${photo}" class="img-thumbnail" style="width:100%">
                                                    </div>
                                                `).join('')}
                                            </div>
                                        ` : `
                                            <p class="text-muted">Photos will be uploaded once your frames are ready.</p>
                                        `}
                                    </div>
                                ` : ''}
                                
                                <div class="order-details">
                                    <h5>Order Summary</h5>
                                    <div class="table-responsive">
                                        <table class="table">
                                            <thead>
                                                <tr>
                                                    <th>Product</th>
                                                    <th>Size</th>
                                                    <th>Price</th>
                                                    <th>Quantity</th>
                                                    <th>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${products.map(product => `
                                                    <tr>
                                                        <td>${product.name}</td>
                                                        <td>${product.size}</td>
                                                        <td>₹${product.price}</td>
                                                        <td>${product.quantity}</td>
                                                        <td>₹${(product.price * product.quantity).toFixed(2)}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td colspan="4" class="text-end"><strong>Total:</strong></td>
                                                    <td>₹${order.finalTotal.toFixed(2)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                                
                                <div class="mt-3">
                                    <button class="btn btn-outline-primary" id="backToOrdersBtn">Back to My Orders</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('backToOrdersBtn').addEventListener('click', loadUserOrdersPage);
        });
    });
}

function loadUserOrdersPage() {
    if (!currentUser) {
        alert('Please login to view your orders');
        loginModal.show();
        return;
    }
    
    firebase.get(firebase.ref(db, `orders`).orderByChild('userId').equalTo(currentUser.uid)).then((snapshot) => {
        const orders = snapshot.val();
        
        mainContent.innerHTML = `
            <div class="row">
                <div class="col-12">
                    <h2>My Orders</h2>
                    ${!orders ? `
                        <div class="alert alert-info">You haven't placed any orders yet.</div>
                        <button class="btn btn-primary" id="shopNowBtn">Shop Now</button>
                    ` : `
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Date</th>
                                        <th>Items</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="ordersList">
                                    <!-- Orders will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        if (orders) {
            const ordersList = document.getElementById('ordersList');
            
            Object.entries(orders).forEach(([orderId, order]) => {
                const itemCount = Object.keys(order.items).length;
                const orderDate = new Date(order.createdAt).toLocaleDateString();
                
                ordersList.innerHTML += `
                    <tr>
                        <td>${orderId}</td>
                        <td>${orderDate}</td>
                        <td>${itemCount} item${itemCount > 1 ? 's' : ''}</td>
                        <td>₹${order.finalTotal.toFixed(2)}</td>
                        <td><span class="order-status ${getStatusClass(order.status)}">${formatStatus(order.status)}</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary view-order" data-id="${orderId}">View</button>
                        </td>
                    </tr>
                `;
            });
            
            // Add event listeners to view buttons
            document.querySelectorAll('.view-order').forEach(button => {
                button.addEventListener('click', (e) => {
                    const orderId = e.target.getAttribute('data-id');
                    loadOrderTrackingPage(orderId);
                });
            });
        } else {
            document.getElementById('shopNowBtn').addEventListener('click', loadProductsPage);
        }
    });
}

function loadAdminDashboard() {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        alert('Access denied');
        loadHomePage();
        return;
    }
    
    mainContent.innerHTML = `
        <div class="row admin-panel">
            <div class="col-md-3 sidebar p-0">
                <div class="p-3">
                    <h5 class="text-center mb-4">Admin Panel</h5>
                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a class="nav-link active" href="#" id="adminDashboardLink">
                                <i class="fas fa-tachometer-alt me-2"></i>Dashboard
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" id="adminOrdersLink">
                                <i class="fas fa-shopping-bag me-2"></i>Orders
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" id="adminProductsLink">
                                <i class="fas fa-box-open me-2"></i>Products
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" id="adminCouponsLink">
                                <i class="fas fa-tag me-2"></i>Coupons
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" id="adminUsersLink">
                                <i class="fas fa-users me-2"></i>Users
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="col-md-9 p-4" id="adminContent">
                <h3>Admin Dashboard</h3>
                <div class="row mt-4">
                    <div class="col-md-4 mb-4">
                        <div class="card bg-primary text-white">
                            <div class="card-body">
                                <h5 class="card-title">Total Orders</h5>
                                <h2 id="totalOrders">0</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-4">
                        <div class="card bg-success text-white">
                            <div class="card-body">
                                <h5 class="card-title">Completed Orders</h5>
                                <h2 id="completedOrders">0</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-4">
                        <div class="card bg-warning text-dark">
                            <div class="card-body">
                                <h5 class="card-title">Pending Orders</h5>
                                <h2 id="pendingOrders">0</h2>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h5>Recent Orders</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Customer</th>
                                        <th>Date</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="recentOrders">
                                    <!-- Recent orders will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load dashboard stats
    firebase.get(firebase.ref(db, 'orders')).then((snapshot) => {
        const orders = snapshot.val();
        
        if (orders) {
            const orderArray = Object.entries(orders).map(([id, order]) => ({ id, ...order }));
            
            // Total orders
            document.getElementById('totalOrders').textContent = orderArray.length;
            
            // Completed orders
            const completed = orderArray.filter(order => order.status === 'delivered').length;
            document.getElementById('completedOrders').textContent = completed;
            
            // Pending orders (all non-delivered)
            const pending = orderArray.length - completed;
            document.getElementById('pendingOrders').textContent = pending;
            
            // Recent orders (last 5)
            const recentOrders = orderArray
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 5);
            
            const recentOrdersContainer = document.getElementById('recentOrders');
            recentOrders.forEach(order => {
                // Get customer name
                firebase.get(firebase.ref(db, `users/${order.userId}/name`)).then((nameSnapshot) => {
                    const customerName = nameSnapshot.val() || 'Customer';
                    
                    recentOrdersContainer.innerHTML += `
                        <tr>
                            <td>${order.id}</td>
                            <td>${customerName}</td>
                            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                            <td>₹${order.finalTotal.toFixed(2)}</td>
                            <td><span class="order-status ${getStatusClass(order.status)}">${formatStatus(order.status)}</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary view-order-admin" data-id="${order.id}">View</button>
                            </td>
                        </tr>
                    `;
                    
                    // Add event listeners to view buttons
                    document.querySelectorAll('.view-order-admin').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const orderId = e.target.getAttribute('data-id');
                            loadAdminOrderDetails(orderId);
                        });
                    });
                });
            });
        }
    });
    
    // Admin navigation
    document.getElementById('adminDashboardLink').addEventListener('click', (e) => {
        e.preventDefault();
        loadAdminDashboard();
    });
    
    document.getElementById('adminOrdersLink').addEventListener('click', (e) => {
        e.preventDefault();
        loadAdminOrders();
    });
    
    document.getElementById('adminProductsLink').addEventListener('click', (e) => {
        e.preventDefault();
        loadAdminProducts();
    });
    
    document.getElementById('adminCouponsLink').addEventListener('click', (e) => {
        e.preventDefault();
        loadAdminCoupons();
    });
    
    document.getElementById('adminUsersLink').addEventListener('click', (e) => {
        e.preventDefault();
        loadAdminUsers();
    });
}

// Helper functions
function getStatusClass(status) {
    switch(status) {
        case 'pending': return 'status-pending';
        case 'processing': return 'status-processing';
        case 'production': return 'status-processing';
        case 'ready': return 'status-processing';
        case 'shipped': return 'status-shipped';
        case 'delivered': return 'status-delivered';
        default: return '';
    }
}

function getStatusAlertClass(status) {
    switch(status) {
        case 'pending': return 'warning';
        case 'processing': return 'info';
        case 'production': return 'info';
        case 'ready': return 'info';
        case 'shipped': return 'primary';
        case 'delivered': return 'success';
        default: return 'secondary';
    }
}

function getStatusIcon(status) {
    switch(status) {
        case 'pending': return 'fa-shopping-cart';
        case 'processing': return 'fa-cog';
        case 'production': return 'fa-hammer';
        case 'ready': return 'fa-box';
        case 'shipped': return 'fa-truck';
        case 'delivered': return 'fa-check-circle';
        default: return 'fa-info-circle';
    }
}

function formatStatus(status) {
    switch(status) {
        case 'pending': return 'Pending';
        case 'processing': return 'Processing';
        case 'production': return 'In Production';
        case 'ready': return 'Ready for Shipping';
        case 'shipped': return 'Shipped';
        case 'delivered': return 'Delivered';
        default: return status;
    }
}

function formatPaymentMethod(method) {
    switch(method) {
        case 'upi': return 'UPI Payment';
        case 'bank_transfer': return 'Bank Transfer';
        default: return method;
    }
}

function getStatusDescription(status) {
    switch(status) {
        case 'pending': 
            return 'Your order has been received and is awaiting processing.';
        case 'processing': 
            return 'Your order is being processed and will move to production soon.';
        case 'production': 
            return 'Your frames are currently being made by our craftsmen.';
        case 'ready': 
            return 'Your frames are ready and will be shipped soon.';
        case 'shipped': 
            return 'Your order has been shipped and is on its way to you.';
        case 'delivered': 
            return 'Your order has been delivered. Thank you for shopping with us!';
        default: 
            return 'Your order is being processed.';
    }
}

// Initialize admin user (run this once to create the admin user)
function initializeAdminUser() {
    const adminEmail = "admin@gantasolutions.com";
    const adminPassword = "Admin@123"; // In production, use a more secure password
    
    firebase.createUserWithEmailAndPassword(auth, adminEmail, adminPassword)
        .then((userCredential) => {
            // Set admin user data
            return firebase.set(firebase.ref(db, 'users/' + userCredential.user.uid), {
                name: "Admin User",
                email: adminEmail,
                phone: "7095615567",
                isAdmin: true,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
        })
        .then(() => {
            console.log("Admin user created successfully");
        })
        .catch((error) => {
            if (error.code === 'auth/email-already-in-use') {
                console.log("Admin user already exists");
            } else {
                console.error("Error creating admin user:", error);
            }
        });
}

// Uncomment this line and run once to create the admin user
// initializeAdminUser();

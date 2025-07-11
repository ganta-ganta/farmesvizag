// Admin-related functions are already included in app.js
// This file is kept for modularity in case you want to separate admin logic

function loadAdminOrders() {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        alert('Access denied');
        loadHomePage();
        return;
    }
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('adminOrdersLink').classList.add('active');
    
    document.getElementById('adminContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Manage Orders</h3>
            <div>
                <select class="form-select d-inline-block w-auto me-2" id="orderStatusFilter">
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="production">In Production</option>
                    <option value="ready">Ready for Shipping</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                </select>
                <button class="btn btn-primary" id="refreshOrdersBtn">Refresh</button>
            </div>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="adminOrdersList">
                    <!-- Orders will be loaded here -->
                </tbody>
            </table>
        </div>
    `;
    
    const loadOrders = (statusFilter = null) => {
        let query = firebase.ref(db, 'orders').orderByChild('createdAt');
        
        firebase.get(query).then((snapshot) => {
            const orders = snapshot.val();
            const ordersList = document.getElementById('adminOrdersList');
            ordersList.innerHTML = '';
            
            if (orders) {
                Object.entries(orders).forEach(([orderId, order]) => {
                    if (statusFilter && order.status !== statusFilter) return;
                    
                    // Get customer name
                    firebase.get(firebase.ref(db, `users/${order.userId}/name`)).then((nameSnapshot) => {
                        const customerName = nameSnapshot.val() || 'Customer';
                        
                        ordersList.innerHTML += `
                            <tr>
                                <td>${orderId}</td>
                                <td>${customerName}</td>
                                <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                                <td>₹${order.finalTotal.toFixed(2)}</td>
                                <td>
                                    <select class="form-select form-select-sm order-status-select" data-id="${orderId}">
                                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                        <option value="production" ${order.status === 'production' ? 'selected' : ''}>In Production</option>
                                        <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready for Shipping</option>
                                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                    </select>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary view-order-admin" data-id="${orderId}">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    ${order.status === 'production' || order.status === 'ready' ? `
                                        <button class="btn btn-sm btn-outline-success upload-photo-btn" data-id="${orderId}">
                                            <i class="fas fa-camera"></i>
                                        </button>
                                    ` : ''}
                                </td>
                            </tr>
                        `;
                        
                        // Add event listeners
                        document.querySelectorAll('.view-order-admin').forEach(button => {
                            button.addEventListener('click', (e) => {
                                const orderId = e.target.closest('button').getAttribute('data-id');
                                loadAdminOrderDetails(orderId);
                            });
                        });
                        
                        document.querySelectorAll('.order-status-select').forEach(select => {
                            select.addEventListener('change', (e) => {
                                const orderId = e.target.getAttribute('data-id');
                                const newStatus = e.target.value;
                                
                                OrderService.updateOrderStatus(orderId, newStatus)
                                    .then(() => {
                                        alert('Order status updated successfully');
                                    })
                                    .catch(error => {
                                        alert('Error updating order status: ' + error.message);
                                        e.target.value = order.status; // Revert on error
                                    });
                            });
                        });
                        
                        document.querySelectorAll('.upload-photo-btn').forEach(button => {
                            button.addEventListener('click', (e) => {
                                const orderId = e.target.closest('button').getAttribute('data-id');
                                showUploadPhotoModal(orderId);
                            });
                        });
                    });
                });
            } else {
                ordersList.innerHTML = '<tr><td colspan="6" class="text-center">No orders found</td></tr>';
            }
        });
    };
    
    // Initial load
    loadOrders();
    
    // Filter by status
    document.getElementById('orderStatusFilter').addEventListener('change', (e) => {
        loadOrders(e.target.value || null);
    });
    
    // Refresh button
    document.getElementById('refreshOrdersBtn').addEventListener('click', () => {
        const statusFilter = document.getElementById('orderStatusFilter').value || null;
        loadOrders(statusFilter);
    });
}

function loadAdminOrderDetails(orderId) {
    firebase.get(firebase.ref(db, `orders/${orderId}`)).then((snapshot) => {
        const order = snapshot.val();
        
        if (!order) {
            alert('Order not found');
            return;
        }
        
        // Get customer info
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
                    document.getElementById('adminContent').innerHTML = `
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h3>Order Details - #${orderId}</h3>
                            <button class="btn btn-outline-secondary" id="backToOrdersBtn">
                                <i class="fas fa-arrow-left me-2"></i>Back to Orders
                            </button>
                        </div>
                        
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>Order Information</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                                        <p><strong>Status:</strong> 
                                            <select class="form-select d-inline-block w-auto order-status-select" data-id="${orderId}">
                                                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                                <option value="production" ${order.status === 'production' ? 'selected' : ''}>In Production</option>
                                                <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready for Shipping</option>
                                                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                            </select>
                                        </p>
                                        <p><strong>Payment Method:</strong> ${formatPaymentMethod(order.payment.method)}</p>
                                        <p><strong>Payment Status:</strong> ${order.payment.status}</p>
                                        <p><strong>Transaction ID:</strong> ${order.payment.transactionId}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <p><strong>Customer:</strong> ${user.name}</p>
                                        <p><strong>Email:</strong> ${user.email}</p>
                                        <p><strong>Phone:</strong> ${user.phone}</p>
                                    </div>
                                </div>
                                
                                <div class="mt-3">
                                    <h6>Delivery Address:</h6>
                                    <p>
                                        ${address.street}<br>
                                        ${address.city}, ${address.state}<br>
                                        ${address.zip}
                                    </p>
                                </div>
                                
                                ${order.status === 'production' || order.status === 'ready' ? `
                                    <div class="mt-3">
                                        <h6>Completion Photos:</h6>
                                        ${order.completionPhotos?.length > 0 ? `
                                            <div class="row">
                                                ${order.completionPhotos.map(photo => `
                                                    <div class="col-md-3 mb-3">
                                                        <img src="${photo}" class="img-thumbnail" style="width:100%">
                                                    </div>
                                                `).join('')}
                                            </div>
                                        ` : `
                                            <p class="text-muted">No photos uploaded yet.</p>
                                        `}
                                        <button class="btn btn-sm btn-primary mt-2" id="uploadPhotoBtn">
                                            <i class="fas fa-camera me-2"></i>Upload Photo
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="card">
                            <div class="card-header">
                                <h5>Order Items</h5>
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
                        </div>
                        
                        <!-- Upload Photo Modal -->
                        <div class="modal fade" id="uploadPhotoModal" tabindex="-1">
                            <div class="modal-dialog">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title">Upload Completion Photo</h5>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                    </div>
                                    <div class="modal-body">
                                        <form id="uploadPhotoForm">
                                            <div class="mb-3">
                                                <label for="completionPhoto" class="form-label">Select Photo</label>
                                                <input type="file" class="form-control" id="completionPhoto" accept="image/*" required>
                                            </div>
                                            <button type="submit" class="btn btn-primary">Upload</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    // Back button
                    document.getElementById('backToOrdersBtn').addEventListener('click', loadAdminOrders);
                    
                    // Status change
                    document.querySelector('.order-status-select').addEventListener('change', (e) => {
                        const newStatus = e.target.value;
                        
                        OrderService.updateOrderStatus(orderId, newStatus)
                            .then(() => {
                                alert('Order status updated successfully');
                            })
                            .catch(error => {
                                alert('Error updating order status: ' + error.message);
                                e.target.value = order.status; // Revert on error
                            });
                    });
                    
                    // Upload photo button
                    if (document.getElementById('uploadPhotoBtn')) {
                        document.getElementById('uploadPhotoBtn').addEventListener('click', () => {
                            const modal = new bootstrap.Modal(document.getElementById('uploadPhotoModal'));
                            modal.show();
                        });
                    }
                    
                    // Upload photo form
                    if (document.getElementById('uploadPhotoForm')) {
                        document.getElementById('uploadPhotoForm').addEventListener('submit', (e) => {
                            e.preventDefault();
                            const fileInput = document.getElementById('completionPhoto');
                            
                            if (fileInput.files.length > 0) {
                                const file = fileInput.files[0];
                                
                                OrderService.uploadCompletionPhoto(orderId, file)
                                    .then(() => {
                                        alert('Photo uploaded successfully');
                                        bootstrap.Modal.getInstance(document.getElementById('uploadPhotoModal')).hide();
                                        loadAdminOrderDetails(orderId); // Refresh view
                                    })
                                    .catch(error => {
                                        alert('Error uploading photo: ' + error.message);
                                    });
                            }
                        });
                    }
                });
            });
        });
    });
}

function showUploadPhotoModal(orderId) {
    document.getElementById('adminContent').innerHTML += `
        <div class="modal fade" id="uploadPhotoModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Upload Completion Photo</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="uploadPhotoForm">
                            <div class="mb-3">
                                <label for="completionPhoto" class="form-label">Select Photo</label>
                                <input type="file" class="form-control" id="completionPhoto" accept="image/*" required>
                            </div>
                            <button type="submit" class="btn btn-primary">Upload</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('uploadPhotoModal'));
    modal.show();
    
    document.getElementById('uploadPhotoForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('completionPhoto');
        
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            
            OrderService.uploadCompletionPhoto(orderId, file)
                .then(() => {
                    alert('Photo uploaded successfully');
                    modal.hide();
                    loadAdminOrders(); // Refresh orders list
                })
                .catch(error => {
                    alert('Error uploading photo: ' + error.message);
                });
        }
    });
}

function loadAdminProducts() {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        alert('Access denied');
        loadHomePage();
        return;
    }
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('adminProductsLink').classList.add('active');
    
    document.getElementById('adminContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Manage Products</h3>
            <button class="btn btn-primary" id="addProductBtn">
                <i class="fas fa-plus me-2"></i>Add Product
            </button>
        </div>
        
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="productsList">
                    <!-- Products will be loaded here -->
                </tbody>
            </table>
        </div>
        
        <!-- Add/Edit Product Modal -->
        <div class="modal fade" id="productModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="productModalTitle">Add New Product</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="productForm">
                            <input type="hidden" id="productId">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="productName" class="form-label">Product Name</label>
                                        <input type="text" class="form-control" id="productName" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="productPrice" class="form-label">Price (₹)</label>
                                        <input type="number" class="form-control" id="productPrice" min="0" step="0.01" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="productCategory" class="form-label">Category</label>
                                        <select class="form-select" id="productCategory" required>
                                            <option value="">Select Category</option>
                                            <option value="wooden">Wooden Frames</option>
                                            <option value="digital">Digital Frames</option>
                                            <option value="collage">Collage Frames</option>
                                            <option value="custom">Custom Frames</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label for="productStock" class="form-label">Stock Quantity</label>
                                        <input type="number" class="form-control" id="productStock" min="0" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="productSizes" class="form-label">Available Sizes (comma separated)</label>
                                        <input type="text" class="form-control" id="productSizes" placeholder="e.g., 8x10, 10x12, 12x16">
                                    </div>
                                    <div class="mb-3">
                                        <label for="productImages" class="form-label">Product Images</label>
                                        <input type="file" class="form-control" id="productImages" multiple accept="image/*">
                                        <div class="mt-2" id="imagePreviews">
                                            <!-- Image previews will be shown here -->
                                        </div>
                                    </div>
                                    <div class="mb-3 form-check">
                                        <input type="checkbox" class="form-check-input" id="productActive">
                                        <label class="form-check-label" for="productActive">Active (visible to customers)</label>
                                    </div>
                                    <div class="mb-3 form-check">
                                        <input type="checkbox" class="form-check-input" id="productWhatsapp">
                                        <label class="form-check-label" for="productWhatsapp">Include in WhatsApp Catalog</label>
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="productDescription" class="form-label">Description</label>
                                <textarea class="form-control" id="productDescription" rows="3"></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">Save Product</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load products
    ProductService.getAllProducts()
        .then(products => {
            const productsList = document.getElementById('productsList');
            
            if (products) {
                Object.entries(products).forEach(([id, product]) => {
                    productsList.innerHTML += `
                        <tr>
                            <td><img src="${product.images?.[0] || 'images/placeholder.jpg'}" width="50"></td>
                            <td>${product.name}</td>
                            <td>₹${product.price}</td>
                            <td>${product.category ? product.category.charAt(0).toUpperCase() + product.category.slice(1) : ''}</td>
                            <td>
                                <span class="badge ${product.active ? 'bg-success' : 'bg-secondary'}">
                                    ${product.active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary edit-product" data-id="${id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-product" data-id="${id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                // Add event listeners
                document.querySelectorAll('.edit-product').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const productId = e.target.closest('button').getAttribute('data-id');
                        showEditProductModal(productId);
                    });
                });
                
                document.querySelectorAll('.delete-product').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const productId = e.target.closest('button').getAttribute('data-id');
                        if (confirm('Are you sure you want to delete this product?')) {
                            ProductService.deleteProduct(productId)
                                .then(() => {
                                    alert('Product deleted successfully');
                                    loadAdminProducts(); // Refresh list
                                })
                                .catch(error => {
                                    alert('Error deleting product: ' + error.message);
                                });
                        }
                    });
                });
            } else {
                productsList.innerHTML = '<tr><td colspan="6" class="text-center">No products found</td></tr>';
            }
        })
        .catch(error => {
            alert('Error loading products: ' + error.message);
        });
    
    // Add product button
    document.getElementById('addProductBtn').addEventListener('click', () => {
        showAddProductModal();
    });
    
    // Product form submission
    document.getElementById('productForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const productId = document.getElementById('productId').value;
        const productData = {
            name: document.getElementById('productName').value,
            price: parseFloat(document.getElementById('productPrice').value),
            category: document.getElementById('productCategory').value,
            stock: parseInt(document.getElementById('productStock').value),
            sizes: document.getElementById('productSizes').value 
                ? document.getElementById('productSizes').value.split(',').map(s => s.trim())
                : [],
            active: document.getElementById('productActive').checked,
            whatsappCatalog: document.getElementById('productWhatsapp').checked,
            description: document.getElementById('productDescription').value,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Handle images (in a real app, you would upload to Firebase Storage)
        const imageFiles = document.getElementById('productImages').files;
        if (imageFiles.length > 0) {
            // In a real implementation, you would upload these images to Firebase Storage
            // and get their URLs to store in the database
            alert('Image upload functionality would be implemented here');
            return;
        }
        
        if (productId) {
            // Update existing product
            ProductService.updateProduct(productId, productData)
                .then(() => {
                    alert('Product updated successfully');
                    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
                    loadAdminProducts(); // Refresh list
                })
                .catch(error => {
                    alert('Error updating product: ' + error.message);
                });
        } else {
            // Add new product
            productData.createdAt = firebase.database.ServerValue.TIMESTAMP;
            productData.images = []; // Would be populated with image URLs
            
            ProductService.addProduct(productData)
                .then(() => {
                    alert('Product added successfully');
                    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
                    loadAdminProducts(); // Refresh list
                })
                .catch(error => {
                    alert('Error adding product: ' + error.message);
                });
        }
    });
}

function showAddProductModal() {
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    document.getElementById('productId').value = '';
    document.getElementById('productForm').reset();
    document.getElementById('imagePreviews').innerHTML = '';
    
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

function showEditProductModal(productId) {
    ProductService.getProductById(productId)
        .then(product => {
            if (!product) {
                alert('Product not found');
                return;
            }
            
            document.getElementById('productModalTitle').textContent = 'Edit Product';
            document.getElementById('productId').value = productId;
            document.getElementById('productName').value = product.name;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productCategory').value = product.category || '';
            document.getElementById('productStock').value = product.stock || 0;
            document.getElementById('productSizes').value = product.sizes?.join(', ') || '';
            document.getElementById('productActive').checked = product.active !== false;
            document.getElementById('productWhatsapp').checked = product.whatsappCatalog || false;
            document.getElementById('productDescription').value = product.description || '';
            
            // Show image previews
            const imagePreviews = document.getElementById('imagePreviews');
            imagePreviews.innerHTML = '';
            
            if (product.images?.length > 0) {
                imagePreviews.innerHTML = '<p class="mb-2">Current Images:</p>';
                product.images.forEach(image => {
                    imagePreviews.innerHTML += `
                        <img src="${image}" class="img-thumbnail me-2" width="80">
                    `;
                });
            }
            
            const modal = new bootstrap.Modal(document.getElementById('productModal'));
            modal.show();
        })
        .catch(error => {
            alert('Error loading product: ' + error.message);
        });
}

function loadAdminCoupons() {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        alert('Access denied');
        loadHomePage();
        return;
    }
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('adminCouponsLink').classList.add('active');
    
    document.getElementById('adminContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Manage Coupons</h3>
            <button class="btn btn-primary" id="addCouponBtn">
                <i class="fas fa-plus me-2"></i>Add Coupon
            </button>
        </div>
        
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Discount</th>
                        <th>Min Order</th>
                        <th>Valid Until</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="couponsList">
                    <!-- Coupons will be loaded here -->
                </tbody>
            </table>
        </div>
        
        <!-- Add/Edit Coupon Modal -->
        <div class="modal fade" id="couponModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="couponModalTitle">Add New Coupon</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="couponForm">
                            <div class="mb-3">
                                <label for="couponCode" class="form-label">Coupon Code</label>
                                <input type="text" class="form-control" id="couponCode" required>
                            </div>
                            <div class="mb-3">
                                <label for="couponType" class="form-label">Discount Type</label>
                                <select class="form-select" id="couponType" required>
                                    <option value="percentage">Percentage</option>
                                    <option value="fixed">Fixed Amount</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="couponValue" class="form-label">Discount Value</label>
                                <input type="number" class="form-control" id="couponValue" min="0" required>
                            </div>
                            <div class="mb-3">
                                <label for="couponMinOrder" class="form-label">Minimum Order Amount (₹)</label>
                                <input type="number" class="form-control" id="couponMinOrder" min="0">
                            </div>
                            <div class="mb-3">
                                <label for="couponMaxDiscount" class="form-label">Maximum Discount (₹) - for percentage only</label>
                                <input type="number" class="form-control" id="couponMaxDiscount" min="0">
                            </div>
                            <div class="mb-3">
                                <label for="couponUsageLimit" class="form-label">Usage Limit</label>
                                <input type="number" class="form-control" id="couponUsageLimit" min="1">
                            </div>
                            <div class="mb-3">
                                <label for="couponValidFrom" class="form-label">Valid From</label>
                                <input type="date" class="form-control" id="couponValidFrom" required>
                            </div>
                            <div class="mb-3">
                                <label for="couponValidTo" class="form-label">Valid To</label>
                                <input type="date" class="form-control" id="couponValidTo" required>
                            </div>
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" id="couponActive" checked>
                                <label class="form-check-label" for="couponActive">Active</label>
                            </div>
                            <button type="submit" class="btn btn-primary">Save Coupon</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load coupons
    firebase.get(firebase.ref(db, 'coupons')).then((snapshot) => {
        const coupons = snapshot.val();
        const couponsList = document.getElementById('couponsList');
        couponsList.innerHTML = '';
        
        if (coupons) {
            Object.entries(coupons).forEach(([code, coupon]) => {
                const validFrom = new Date(coupon.validFrom).toLocaleDateString();
                const validTo = new Date(coupon.validTo).toLocaleDateString();
                
                couponsList.innerHTML += `
                    <tr>
                        <td>${code}</td>
                        <td>
                            ${coupon.discountType === 'percentage' 
                                ? `${coupon.value}%` 
                                : `₹${coupon.value}`}
                        </td>
                        <td>${coupon.minOrder ? `₹${coupon.minOrder}` : 'None'}</td>
                        <td>${validTo}</td>
                        <td>
                            <span class="badge ${coupon.active ? 'bg-success' : 'bg-secondary'}">
                                ${coupon.active ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary edit-coupon" data-code="${code}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-coupon" data-code="${code}">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="btn btn-sm ${coupon.active ? 'btn-warning' : 'btn-success'} toggle-coupon" data-code="${code}">
                                <i class="fas ${coupon.active ? 'fa-eye-slash' : 'fa-eye'}"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            // Add event listeners
            document.querySelectorAll('.edit-coupon').forEach(button => {
                button.addEventListener('click', (e) => {
                    const couponCode = e.target.closest('button').getAttribute('data-code');
                    showEditCouponModal(couponCode);
                });
            });
            
            document.querySelectorAll('.delete-coupon').forEach(button => {
                button.addEventListener('click', (e) => {
                    const couponCode = e.target.closest('button').getAttribute('data-code');
                    if (confirm('Are you sure you want to delete this coupon?')) {
                        firebase.remove(firebase.ref(db, `coupons/${couponCode}`))
                            .then(() => {
                                alert('Coupon deleted successfully');
                                loadAdminCoupons(); // Refresh list
                            })
                            .catch(error => {
                                alert('Error deleting coupon: ' + error.message);
                            });
                    }
                });
            });
            
            document.querySelectorAll('.toggle-coupon').forEach(button => {
                button.addEventListener('click', (e) => {
                    const couponCode = e.target.closest('button').getAttribute('data-code');
                    const isActive = e.target.closest('button').classList.contains('btn-warning');
                    
                    firebase.update(firebase.ref(db, `coupons/${couponCode}`), {
                        active: !isActive
                    })
                    .then(() => {
                        alert(`Coupon ${isActive ? 'deactivated' : 'activated'} successfully`);
                        loadAdminCoupons(); // Refresh list
                    })
                    .catch(error => {
                        alert('Error updating coupon: ' + error.message);
                    });
                });
            });
        } else {
            couponsList.innerHTML = '<tr><td colspan="6" class="text-center">No coupons found</td></tr>';
        }
    });
    
    // Add coupon button
    document.getElementById('addCouponBtn').addEventListener('click', () => {
        showAddCouponModal();
    });
    
    // Coupon form submission
    document.getElementById('couponForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const couponCode = document.getElementById('couponCode').value;
        const couponData = {
            code: couponCode,
            discountType: document.getElementById('couponType').value,
            value: parseFloat(document.getElementById('couponValue').value),
            minOrder: document.getElementById('couponMinOrder').value 
                ? parseFloat(document.getElementById('couponMinOrder').value)
                : 0,
            maxDiscount: document.getElementById('couponMaxDiscount').value 
                ? parseFloat(document.getElementById('couponMaxDiscount').value)
                : null,
            usageLimit: document.getElementById('couponUsageLimit').value 
                ? parseInt(document.getElementById('couponUsageLimit').value)
                : null,
            validFrom: new Date(document.getElementById('couponValidFrom').value).getTime(),
            validTo: new Date(document.getElementById('couponValidTo').value).getTime(),
            active: document.getElementById('couponActive').checked,
            usedCount: 0
        };
        
        // Save coupon
        firebase.set(firebase.ref(db, `coupons/${couponCode}`), couponData)
            .then(() => {
                alert('Coupon saved successfully');
                bootstrap.Modal.getInstance(document.getElementById('couponModal')).hide();
                loadAdminCoupons(); // Refresh list
            })
            .catch(error => {
                alert('Error saving coupon: ' + error.message);
            });
    });
}

function showAddCouponModal() {
    document.getElementById('couponModalTitle').textContent = 'Add New Coupon';
    document.getElementById('couponForm').reset();
    
    // Set default dates (today and 1 month from now)
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = nextMonth.toISOString().split('T')[0];
    
    document.getElementById('couponValidFrom').value = today;
    document.getElementById('couponValidTo').value = nextMonthStr;
    
    const modal = new bootstrap.Modal(document.getElementById('couponModal'));
    modal.show();
}

function showEditCouponModal(couponCode) {
    firebase.get(firebase.ref(db, `coupons/${couponCode}`)).then((snapshot) => {
        const coupon = snapshot.val();
        
        if (!coupon) {
            alert('Coupon not found');
            return;
        }
        
        document.getElementById('couponModalTitle').textContent = 'Edit Coupon';
        document.getElementById('couponCode').value = coupon.code;
        document.getElementById('couponCode').readOnly = true;
        document.getElementById('couponType').value = coupon.discountType;
        document.getElementById('couponValue').value = coupon.value;
        document.getElementById('couponMinOrder').value = coupon.minOrder || '';
        document.getElementById('couponMaxDiscount').value = coupon.maxDiscount || '';
        document.getElementById('couponUsageLimit').value = coupon.usageLimit || '';
        
        const validFrom = new Date(coupon.validFrom);
        document.getElementById('couponValidFrom').value = validFrom.toISOString().split('T')[0];
        
        const validTo = new Date(coupon.validTo);
        document.getElementById('couponValidTo').value = validTo.toISOString().split('T')[0];
        
        document.getElementById('couponActive').checked = coupon.active !== false;
        
        const modal = new bootstrap.Modal(document.getElementById('couponModal'));
        modal.show();
    });
}

function loadAdminUsers() {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        alert('Access denied');
        loadHomePage();
        return;
    }
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('adminUsersLink').classList.add('active');
    
    document.getElementById('adminContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Manage Users</h3>
        </div>
        
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Registered On</th>
                        <th>Orders</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="usersList">
                    <!-- Users will be loaded here -->
                </tbody>
            </table>
        </div>
    `;
    
    // Load users
    firebase.get(firebase.ref(db, 'users')).then((snapshot) => {
        const users = snapshot.val();
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';
        
        if (users) {
            Object.entries(users).forEach(([userId, user]) => {
                // Skip admin user
                if (user.email === ADMIN_EMAIL) return;
                
                // Get user's order count
                firebase.get(firebase.ref(db, 'orders').orderByChild('userId').equalTo(userId)).then((orderSnapshot) => {
                    const orders = orderSnapshot.val();
                    const orderCount = orders ? Object.keys(orders).length : 0;
                    
                    usersList.innerHTML += `
                        <tr>
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td>${user.phone || 'N/A'}</td>
                            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                            <td>${orderCount}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary view-user-orders" data-id="${userId}">
                                    <i class="fas fa-shopping-bag"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    
                    // Add event listeners
                    document.querySelectorAll('.view-user-orders').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const userId = e.target.closest('button').getAttribute('data-id');
                            loadAdminUserOrders(userId);
                        });
                    });
                });
            });
        } else {
            usersList.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
        }
    });
}

function loadAdminUserOrders(userId) {
    firebase.get(firebase.ref(db, `users/${userId}`)).then((userSnapshot) => {
        const user = userSnapshot.val();
        
        firebase.get(firebase.ref(db, 'orders').orderByChild('userId').equalTo(userId)).then((ordersSnapshot) => {
            const orders = ordersSnapshot.val();
            
            document.getElementById('adminContent').innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3>Orders for ${user.name}</h3>
                    <button class="btn btn-outline-secondary" id="backToUsersBtn">
                        <i class="fas fa-arrow-left me-2"></i>Back to Users
                    </button>
                </div>
                
                ${!orders ? `
                    <div class="alert alert-info">This user hasn't placed any orders yet.</div>
                ` : `
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="userOrdersList">
                                <!-- Orders will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                `}
            `;
            
            if (orders) {
                const userOrdersList = document.getElementById('userOrdersList');
                
                Object.entries(orders).forEach(([orderId, order]) => {
                    userOrdersList.innerHTML += `
                        <tr>
                            <td>${orderId}</td>
                            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                            <td>₹${order.finalTotal.toFixed(2)}</td>
                            <td><span class="order-status ${getStatusClass(order.status)}">${formatStatus(order.status)}</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary view-order-admin" data-id="${orderId}">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                // Add event listeners to view buttons
                document.querySelectorAll('.view-order-admin').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const orderId = e.target.closest('button').getAttribute('data-id');
                        loadAdminOrderDetails(orderId);
                    });
                });
            }
            
            // Back button
            document.getElementById('backToUsersBtn').addEventListener('click', loadAdminUsers);
        });
    });
}

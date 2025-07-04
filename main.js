function CreateRendererByType(canvas,method)
{
    switch(method)
    {
        case "attribute":
            return new AttributeRenderer(canvas, method);
        case 'ubo':
            return new UBORenderer(canvas, method);
        case 'texture':
            return new TextureRenderer(canvas, method);
        default:
            return new InstanceRenderer(canvas, method);
    }
}

// 初始化函数
function initDemo() {
    const monitor = new PerformanceMonitor();
    
    // 创建三个渲染器
    const methods = ['attribute', 'ubo', 'texture'];
    
    methods.forEach(method => {
        const canvas = document.getElementById(`canvas-${method}`);
        const statsElement = document.getElementById(`stats-${method}`);
        
        try {
            const renderer = CreateRendererByType(canvas, method);
            monitor.addRenderer(method, renderer, statsElement);
            renderer.animate(0);
        } catch (error) {
            console.error(`Failed to initialize ${method} renderer:`, error);
            statsElement.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        }
    });
    
    // 添加方法切换按钮
    const container = document.querySelector('.controls');
    const methodSelector = document.createElement('div');
    methodSelector.className = 'control-group';
    methodSelector.innerHTML = `
        <label>选择方法：</label>
        <div style="display: flex; gap: 10px;">
            <button class="method-btn" data-method="attribute" style="background-color: #FF6B6B;">顶点属性</button>
            <button class="method-btn" data-method="ubo" style="background-color: #4ECDC4;">UBO</button>
            <button class="method-btn" data-method="texture" style="background-color: #FFE66D;">纹理</button>
        </div>
    `;
    container.insertBefore(methodSelector, container.firstChild);
    
    // 添加按钮样式
    const style = document.createElement('style');
    style.textContent = `
        .method-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            color: #000;
            opacity: 0.5;
            transition: opacity 0.3s;
        }
        .method-btn.active {
            opacity: 1;
        }
        .method-btn:hover {
            opacity: 0.8;
        }
    `;
    document.head.appendChild(style);
    
    // 设置初始活动方法
    monitor.setActiveMethod('attribute');
    document.querySelector('[data-method="attribute"]').classList.add('active');
    
    // 添加方法切换事件
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const method = e.target.dataset.method;
            
            // 更新按钮状态
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // 切换活动方法
            monitor.setActiveMethod(method);
        });
    });
    
    monitor.update();
    
    // 添加实例数量控制
    const instanceCountSlider = document.getElementById('instance-count');
    const instanceCountValue = document.getElementById('instance-count-value');
    
    instanceCountSlider.addEventListener('input', (e) => {
        const count = parseInt(e.target.value);
        instanceCountValue.textContent = count;
        for (const [name, renderer] of Object.entries(monitor.renderers)) {
            renderer.destory()
        }
        
        // 重新创建渲染器
        methods.forEach(method => {
            const canvas = document.getElementById(`canvas-${method}`);
            const statsElement = document.getElementById(`stats-${method}`);
            try {
                let renderer
                renderer = CreateRendererByType(canvas, method);
                renderer.instanceCount = count;
                renderer.instances = [];
                renderer.init();
                renderer.setActive(!!monitor.isEnabledRenders[method]);
                monitor.addRenderer(method, renderer, statsElement);
                renderer.animate(0);
            } catch (error) {
                console.error(`Failed to reinitialize ${method} renderer:`, error);
            }
        });
    });
}


// 页面加载完成后初始化
window.addEventListener('load', initDemo);
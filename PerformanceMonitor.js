// 性能监控器
class PerformanceMonitor {

    constructor() {
        this.renderers = {};
        this.statsElements = {};
        this.isEnabledRenders = {};
        this.MAX_STAT_CNT = 30;
        this.statCount = 0;
        this.t_fps = 0;
        this.t_updateTime = 0;
        this.t_renderTime = 0;
        this.t_totalTime = 0;
    }
    
    addRenderer(name, renderer, statsElement) {
        this.renderers[name] = renderer;
        this.statsElements[name] = statsElement;
    }
    
    setActiveMethod(method) {
        this.isEnabledRenders[method] = !this.isEnabledRenders[method];
        this.renderers[method].setActive(this.isEnabledRenders[method])
    }
    
    update() {
        for (const [name, renderer] of Object.entries(this.renderers)) {
            if(this.isEnabledRenders[name])
            {
                const element = this.statsElements[name];
                if (renderer && element) {
                    const stats = renderer.getStats();
                    if(this.statCount>0)
                    {
                        this.t_fps += stats.fps;
                        this.t_updateTime += stats.updateTime;
                        this.t_renderTime += stats.renderTime;
                        this.t_totalTime += stats.totalTime;
                        this.statCount--;
                    }
                    else
                    {
                        element.querySelector('.fps').textContent = (this.t_fps/this.MAX_STAT_CNT).toFixed(2);
                        element.querySelector('.update-time').textContent = (this.t_updateTime/this.MAX_STAT_CNT).toFixed(2);
                        element.querySelector('.render-time').textContent = (this.t_renderTime/this.MAX_STAT_CNT).toFixed(2);
                        element.querySelector('.total-time').textContent = (this.t_totalTime/this.MAX_STAT_CNT).toFixed(2);
                        this.t_fps = 0;
                        this.t_updateTime = 0;
                        this.t_renderTime = 0;
                        this.t_totalTime = 0;
                        this.statCount = this.MAX_STAT_CNT;
                    }
                }
            }
        }
        requestAnimationFrame(() => this.update());
    }
}

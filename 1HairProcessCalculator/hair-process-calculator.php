<?php
/**
 * Plugin Name: Hair Process Calculator
 * Plugin URI: https://www.indiannaturalhair.com
 * Description: A comprehensive calculator for hair processing including cuticle removal, permanent straightening, and bleaching processes.
 * Version: 1.0.0
 * Author: IND Natural Hair
 * Author URI: https://www.indiannaturalhair.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: hair-process-calculator
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('HPC_PLUGIN_URL', plugin_dir_url(__FILE__));
define('HPC_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('HPC_VERSION', '1.0.0');

class HairProcessCalculator {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
    }
    
    public function init() {
        // Register shortcode
        add_shortcode('hair_calculator', array($this, 'render_calculator'));
        
        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        
        // Add admin menu for plugin settings (optional)
        add_action('admin_menu', array($this, 'add_admin_menu'));
    }
    
    public function enqueue_assets() {
        // Only enqueue on pages that contain the shortcode
        global $post;
        if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'hair_calculator')) {
            wp_enqueue_style(
                'hair-calculator-styles',
                HPC_PLUGIN_URL . 'hair-calculator-styles.css',
                array(),
                HPC_VERSION
            );
            
            wp_enqueue_script(
                'hair-calculator-script',
                HPC_PLUGIN_URL . 'hair-calculator-script.js',
                array('jquery'),
                HPC_VERSION,
                true
            );
        }
    }
    
    public function render_calculator($atts) {
        // Parse shortcode attributes
        $atts = shortcode_atts(array(
            'default_tab' => 'cuticle',
            'show_footer' => 'true'
        ), $atts, 'hair_calculator');
        
        // Start output buffering
        ob_start();
        
        // Render the calculator HTML
        $this->render_calculator_html($atts);
        
        // Return the buffered content
        return ob_get_clean();
    }
    
    private function render_calculator_html($atts) {
        $default_tab = sanitize_text_field($atts['default_tab']);
        $show_footer = filter_var($atts['show_footer'], FILTER_VALIDATE_BOOLEAN);
        ?>
        <div class="hair-calculator">
            <header>
            <h1>Hair Process Calculator</h1>
            <p class="subtitle">Professional formulations for cuticle removal, permanent straightening, and bleaching</p>
        </header>

            <div class="layout">
                <aside>
                    <nav class="nav">
                        <button class="btn <?php echo $default_tab === 'cuticle' ? 'active' : ''; ?>" data-target="cuticle">Cuticle Removal</button>
                        <button class="btn <?php echo $default_tab === 'thioglycolate' ? 'active' : ''; ?>" data-target="thioglycolate">Permanent Straightening</button>
                        <button class="btn <?php echo $default_tab === 'mordant' ? 'active' : ''; ?>" data-target="mordant">Bleaching</button>
                    </nav>
                </aside>

                <main>
                    <!-- Cuticle Removal Section -->
                    <section id="cuticle" class="panel <?php echo $default_tab === 'cuticle' ? 'active' : ''; ?>" <?php echo $default_tab !== 'cuticle' ? 'style="display:none;"' : ''; ?>>
                        <div class="grid">
                            <div>
                                <label for="c_weight">Hair weight (g)</label>
                                <input id="c_weight" type="number" min="1" step="1" value="1000" />
                                <label for="c_percent" style="margin-top:10px">Process percentage (%)</label>
                                <input id="c_percent" type="number" min="1" max="100" step="1" value="100" />
                                <div class="stack">
                                    <button class="btn" id="c_copy">Copy</button>
                                </div>
                                <div class="note" id="c_note">Baseline is 1,000 g at 100%.</div>
                            </div>
                            <div>
                                <table>
                                    <thead><tr><th>Component</th><th>Amount</th></tr></thead>
                                    <tbody id="c_tbody"></tbody>
                                </table>
                                <div class="note">Safety: mask + eye protection. Keep plastic vessels only.<br>Acid bath: 20 min → Wash 3× → Neutralize: 45 min → Wash 3×.</div>
                            </div>
                        </div>
                    </section>

                    <!-- Permanent Straightening Section -->
                    <section id="thioglycolate" class="panel" <?php echo $default_tab !== 'thioglycolate' ? 'style="display:none;"' : ''; ?>>
                        <div class="grid">
                            <div>
                                <label for="t_hair">Hair weight (g)</label>
                                <input id="t_hair" type="number" min="1" step="1" value="100" />
                                <label for="t_ratio" style="margin-top:10px">Bath volume per 100g (mL)</label>
                                <input id="t_ratio" type="number" min="1" step="1" value="200" />
                                <div class="stack">
                                    <button class="btn" id="t_copy">Copy</button>
                                </div>
                                <div class="note" id="t_note">~57.5% ATG with 25% NH₃</div>
                            </div>
                            <div>
                                <table>
                                    <thead><tr><th>Component</th><th>Amount</th></tr></thead>
                                    <tbody id="t_tbody"></tbody>
                                </table>
                                <div class="note">Safety: mask + eye protection. Keep plastic vessels only.<br>Process: 20-30 min → Wash 3× → Neutralize: 5-10 min → Wash 3×.</div>
                            </div>
                        </div>
                    </section>
                    
                    <!-- Bleaching Section -->
                    <section id="mordant" class="panel" <?php echo $default_tab !== 'mordant' ? 'style="display:none;"' : ''; ?>>
                        <div class="grid">
                            <div>
                                <label for="b_weight">Hair weight (g)</label>
                                <input id="b_weight" type="number" min="1" step="1" value="100" />
                                <div class="stack">
                                    <button class="btn" id="b_copy">Copy</button>
                                </div>
                                <div class="note" id="b_note">Mordant → Bleach → Neutralize process</div>
                            </div>
                            <div>
                                <h3>Step 1 — Mordanting</h3>
                                <table>
                                    <thead><tr><th>Component</th><th>Amount</th></tr></thead>
                                    <tbody id="b_mordant"></tbody>
                                </table>
                                <h3>Step 2 — Bleach Bath (500 ml per 100g)</h3>
                                <table>
                                    <thead><tr><th>Component</th><th>Amount</th></tr></thead>
                                    <tbody id="b_bleach"></tbody>
                                </table>
                                <h3>Step 3 — Neutralizer</h3>
                                <table>
                                    <thead><tr><th>Component</th><th>Amount</th></tr></thead>
                                    <tbody id="b_neut"></tbody>
                                </table>
                                <div class="note">Safety: mask + eye protection. Keep plastic vessels only.<br>Mordant: 30 min → Wash 3× → Neutralize: 15 min → Wash 3× → Bleach: 20-30 min → Wash 3× → Neutralize: 10 min → Wash 3×.</div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>

            <?php if ($show_footer): ?>
            <footer>
                Hair Process Calculator &copy; 2025 by <a href="https://www.indiannaturalhair.com" style="color:var(--accent); text-decoration:none; font-weight:500;">IND Natural Hair</a>
            </footer>
            <?php endif; ?>
        </div>
        <?php
    }
    
    public function add_admin_menu() {
        add_options_page(
            'Hair Process Calculator Settings',
            'Hair Calculator',
            'manage_options',
            'hair-process-calculator',
            array($this, 'admin_page')
        );
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>Hair Process Calculator</h1>
            <div class="card">
                <h2>How to Use</h2>
                <p>To display the Hair Process Calculator on any page or post, use the following shortcode:</p>
                <code>[hair_calculator]</code>
                
                <h3>Shortcode Parameters</h3>
                <ul>
                    <li><strong>default_tab</strong> - Set the default active tab (cuticle, thioglycolate, or mordant). Default: cuticle</li>
                    <li><strong>show_footer</strong> - Show or hide the footer (true or false). Default: true</li>
                </ul>
                
                <h3>Examples</h3>
                <p><code>[hair_calculator default_tab="thioglycolate"]</code> - Start with Permanent Straightening tab</p>
                <p><code>[hair_calculator show_footer="false"]</code> - Hide the footer</p>
                <p><code>[hair_calculator default_tab="mordant" show_footer="false"]</code> - Start with Bleaching tab and hide footer</p>
            </div>
            
            <div class="card">
                <h2>Plugin Information</h2>
                <p><strong>Version:</strong> <?php echo HPC_VERSION; ?></p>
                <p><strong>Author:</strong> IND Natural Hair</p>
                <p><strong>Website:</strong> <a href="https://www.indiannaturalhair.com" target="_blank">https://www.indiannaturalhair.com</a></p>
            </div>
        </div>
        <?php
    }
}

// Initialize the plugin
new HairProcessCalculator();

// Activation hook
register_activation_hook(__FILE__, 'hpc_activate');
function hpc_activate() {
    // Plugin activation code here if needed
    flush_rewrite_rules();
}

// Deactivation hook
register_deactivation_hook(__FILE__, 'hpc_deactivate');
function hpc_deactivate() {
    // Plugin deactivation code here if needed
    flush_rewrite_rules();
}

// Uninstall hook
register_uninstall_hook(__FILE__, 'hpc_uninstall');
function hpc_uninstall() {
    // Plugin uninstall code here if needed
    // Clean up any options, database tables, etc.
}

?>
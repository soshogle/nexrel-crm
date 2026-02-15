<?php

namespace FSProVendor;

/**
 * @var string $assets_url .
 * @var Plugin[] $plugins .
 * @var string[] $categories .
 */
use FSProVendor\Octolize\ShippingExtensions\Page\Plugin;
\defined('ABSPATH') || exit;
?>
<div class="oct-shipping-extensions">
    <header class="oct-shipping-extensions-header">
        <h1 class="oct-shipping-extensions-header-title">
            <?php 
echo \wp_kses_post(\get_admin_page_title());
?>
        </h1>
    </header>

    <div class="oct-shipping-extension-content-wrapper">
        <section class="oct-shipping-extensions-top">
            <h1><?php 
\esc_html_e('Shipping Extensions by', 'flexible-shipping-pro');
?> <img alt="Octolize" src="<?php 
echo \esc_url($assets_url);
?>img/logo-black.svg"/></h1>
            <p><?php 
\esc_html_e('Dive into a system of Octolize ecommerce shipping plugins for WooCommerce. Don’t lose your customers, time and money. Let our plugins secure your sales!', 'flexible-shipping-pro');
?></p>
        </section>

        <div class="oct-shipping-extensions-notice-list-hide">
            <div class="wp-header-end"></div>
        </div>

        <?php 
if ($categories) {
    ?>
            <div class="oct-plugins-filter">
                <span><?php 
    \esc_html_e('Filter plugins:', 'flexible-shipping-pro');
    ?></span>

                <ul>
                    <li><a href="#0" data-category="all" class="btn active js--filter-item"><?php 
    \esc_html_e('All', 'flexible-shipping-pro');
    ?></a></li>
                    <?php 
    foreach ($categories as $category) {
        ?>
                        <li><a href="#0" data-category="<?php 
        echo \esc_attr(\sanitize_title($category));
        ?>" class="btn js--filter-item"><?php 
        echo \wp_kses_post($category);
        ?></a></li>
                    <?php 
    }
    ?>
                </ul>
            </div>
        <?php 
}
?>

        <div class="oct-shipping-extensions-plugins">
            <?php 
foreach ($plugins as $plugin) {
    ?>
                <div class="oct-shipping-extensions-plugin js--plugin-item" data-category="<?php 
    echo \esc_attr($plugin->get_category_slug());
    ?>">
                    <div class="oct-plugin-info">
                        <img
                            class="oct-plugin-icon"
                            src="<?php 
    echo \esc_url($assets_url);
    ?>img/plugin-icons/<?php 
    echo \esc_attr($plugin->get_icon());
    ?>"
                            alt="<?php 
    echo \esc_attr($plugin->get_plugin_name());
    ?>"/>

                        <div class="oct-plugin-info-content">
                            <h2 class="oct-plugin-name">
                                <?php 
    echo \wp_kses_post($plugin->get_plugin_name());
    ?>
                            </h2>

                            <div class="oct-plugin-desc">
                                <?php 
    echo \wp_kses_post($plugin->get_description());
    ?>
                            </div>
                        </div>
                    </div>

                    <div class="oct-plugin-actions">
                        <a href="<?php 
    echo \esc_url($plugin->get_plugin_url());
    ?>" target="_blank" class="btn-buy"><?php 
    \esc_html_e('Buy plugin →', 'flexible-shipping-pro');
    ?></a>
                    </div>
                </div>
            <?php 
}
?>
        </div>
    </div>
</div>
<?php 

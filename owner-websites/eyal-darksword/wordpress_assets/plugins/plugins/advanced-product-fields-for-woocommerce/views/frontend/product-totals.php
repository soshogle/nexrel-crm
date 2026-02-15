<?php
 /** @var string $product_type */
 /** @var string $product_price*/
 /** @var string $product_id */
 /** @var bool $hide_at_start */

 ?>
<div class="wapf-product-totals" data-product-type="<?php echo esc_attr( $product_type ); ?>" data-product-price="<?php echo esc_attr( $product_price ); ?>" data-product-id="<?php echo esc_attr( $product_id ); ?>">
    <div class="wapf--inner">
        <div>
            <span><?php esc_html_e('Product total','advanced-product-fields-for-woocommerce'); ?></span>
            <span class="wapf-product-total price amount"></span>
        </div>
        <div>
            <span><?php esc_html_e('Options total','advanced-product-fields-for-woocommerce'); ?></span>
            <span class="wapf-options-total price amount"></span>
        </div>
        <div>
            <span><?php esc_html_e('Grand total','advanced-product-fields-for-woocommerce'); ?></span>
            <span class="wapf-grand-total price amount"></span>
        </div>
    </div>
</div>
<?php /* @var $model array */ ?>

<div class="wapf-field__setting" data-setting="<?php echo $model['id']; ?>">
    <div class="wapf-setting__label">
        <label><?php echo esc_html($model['label'] );?></label>
        <?php if(isset($model['description'])) { ?>
            <p class="wapf-description">
                <?php echo esc_html($model['description'] );?>
            </p>
        <?php } ?>
    </div>
    <div class="wapf-setting__input">
        <div style="width:48%;">
            <div class="wapf-input-prepend"><?php esc_html_e('Width','advanced-product-fields-for-woocommerce'); ?></div>
            <div class="wapf-input-append">%</div>
            <div class="wapf-input-with-prepend-append">
                <input
                    rv-on-keyup="onChange" min="0" max="100"
                    rv-value="<?php echo $model['is_field_setting'] ? 'field' : 'settings'; ?>.width"
                    type="number"
                />
            </div>
        </div>
        <div style="width:48%; padding-left:2%;">
            <div class="wapf-input-prepend"><?php esc_html_e('CSS Class','advanced-product-fields-for-woocommerce'); ?></div>
            <div class="wapf-input-with-prepend-append">
                <input
                    rv-on-keyup="onChange"
                    rv-value="<?php echo $model['is_field_setting'] ? 'field' : 'settings'; ?>.class"
                    type="text"
                />
            </div>
        </div>
    </div>
</div>
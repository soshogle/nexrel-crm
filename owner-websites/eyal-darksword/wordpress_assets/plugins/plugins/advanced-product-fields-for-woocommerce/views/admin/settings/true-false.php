<?php
/* @var $model array */
$pro = isset($model['pro']) && $model['pro'] === true;
?>

<div class="wapf-field__setting" data-pro="<?php echo $pro ? 'true':'false'; ?>" data-setting="<?php echo $model['id']; ?>">
    <div class="wapf-setting__label">
        <label><?php echo esc_html( $model['label'] );?> <?php if($pro) esc_html_e('(Pro only)','advanced-product-fields-for-woocommerce'); ?></label>
        <?php if(isset($model['description'])) { ?>
            <p class="wapf-description">
                <?php echo esc_html( $model['description'] );?>
            </p>
        <?php } ?>
    </div>
    <div class="wapf-setting__input">
        <div class="wapf-toggle" rv-unique-checkbox>
            <input <?php echo $pro ? 'disabled':'';?> rv-on-change="onChange" rv-checked="<?php echo $model['is_field_setting'] ? 'field' : 'settings'; ?>.<?php echo $model['id']; ?>" type="checkbox" >
            <label class="wapf-toggle__label" for="wapf-toggle-">
                <span class="wapf-toggle__inner" data-true="<?php esc_attr_e('Yes','advanced-product-fields-for-woocommerce'); ?>" data-false="<?php esc_attr_e('No','advanced-product-fields-for-woocommerce'); ?>"></span>
                <span class="wapf-toggle__switch"></span>
            </label>
        </div>

    </div>
</div>
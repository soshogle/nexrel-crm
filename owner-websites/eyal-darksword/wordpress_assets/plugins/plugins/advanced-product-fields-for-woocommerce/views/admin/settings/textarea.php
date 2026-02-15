<?php /* @var $model array */ ?>

<div class="wapf-field__setting" data-setting="<?php echo $model['id']; ?>">
    <div class="wapf-setting__label">
        <label><?php echo esc_html( $model['label'] );?></label>
        <?php if(isset($model['description'])) { ?>
            <p class="wapf-description">
                <?php echo esc_html( $model['description'] );?>
            </p>
        <?php } ?>
    </div>
    <div class="wapf-setting__input">
        <textarea rv-on-keyup="onChange" rv-value="<?php echo $model['is_field_setting'] ? 'field' : 'settings'; ?>.<?php echo esc_attr( $model['id'] ); ?>" rows="5"></textarea>
    </div>
</div>
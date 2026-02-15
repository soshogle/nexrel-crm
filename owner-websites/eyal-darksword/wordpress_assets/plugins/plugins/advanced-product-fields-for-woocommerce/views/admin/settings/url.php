<?php /* @var $model array */ ?>

<div class="wapf-field__setting" data-setting="<?php echo $model['id']; ?>">
    <div class="wapf-setting__label">
        <label><?php echo esc_html ($model['label'] );?></label>
        <?php if(isset($model['description'])) { ?>
            <p class="wapf-description">
                <?php echo esc_html( $model['description'] );?>
            </p>
        <?php } ?>
    </div>
    <div class="wapf-setting__input">
        <input
            <?php if($model['id'] === 'label') echo 'rv-on-change="field.updateKey"'; ?>
            rv-on-keyup="onChange"
            rv-value="<?php echo $model['is_field_setting'] ?  'field' : 'settings'; ?>.<?php echo $model['id']; ?>"
            type="email"
        />

    </div>
</div>
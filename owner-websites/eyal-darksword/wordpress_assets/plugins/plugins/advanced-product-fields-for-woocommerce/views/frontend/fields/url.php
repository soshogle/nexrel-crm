<?php
/** @var array $model */
?>


<input type="url" value="<?php echo esc_attr( $model['field_value'] ); ?>" 
    <?php
    // phpcs:ignore WordPress.Security.EscapeOutput.UnsafePrintingFunction, WordPress.Security.EscapeOutput.OutputNotEscaped  
    echo $model['field_attributes']; 
    ?> 
/>

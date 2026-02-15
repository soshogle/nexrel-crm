<?php /* @var $model array */ ?>

<div class="wapf-field__setting" data-setting="<?php echo $model['id']; ?>">
    <div class="wapf-setting__label">
        <label><?php echo esc_html( $model['label'] );?></label>
        <p class="wapf-description">
            <?php esc_html( $model['description'] );?>
        </p>
    </div>
    <div class="wapf-setting__input">

        <div style="width:100%;"  class="wapf-field__conditionals">

            <div class="wapf-field__conditionals__container">
                <div rv-if="fieldsForConditionals.fields | isEmpty" class="wapf-lighter">
                    <?php esc_html_e('You need atleast 2 input fields for conditional logic. Add another input field first.','advanced-product-fields-for-woocommerce');?>
                </div>
                <div rv-if="fieldsForConditionals.fields | isNotEmpty">
                    <div rv-each-conditional="field.conditionals">
                        <table style="padding-bottom:10px;width:100%;" class="wapf-field__conditional">
                            <tr rv-each-rule="conditional.rules">
                                <td>
                                    <select rv-on-change="onConditionalFieldChange" rv-value="rule.field">
                                        <option rv-each-fieldobj="fieldsForConditionals.fields" rv-value="fieldobj.id">{fieldobj.label}</option>
                                    </select>
                                </td>
                                <td>
                                    <select rv-on-change="onChange" rv-value="rule.condition">
                                        <option rv-disabled="condition.pro" rv-each-condition="availableConditions | filterConditions rule.field fields" rv-value="condition.value">{ condition.label }</option>
                                    </select>
                                </td>
                                <td>
                                    <input rv-if="rule.condition | conditionNeedsValue availableConditions 'text' fields rule.field" rv-on-keyup="onChange" type="text" rv-value="rule.value" />
                                    <input rv-if="rule.condition | conditionNeedsValue availableConditions 'number' fields rule.field" step="any" rv-on-change="onChange" rv-on-keyup="onChange" type="number" rv-value="rule.value" />
                                    <select rv-if="rule.condition | conditionNeedsValue availableConditions 'options' fields rule.field" rv-on-change="onChange" rv-value="rule.value">
                                        <option rv-each-v="fields | getChoices rule.field" rv-value="v.slug">{v.label}</option>
                                    </select>
                                </td>
                                <td style="width: 125px;">
                                    <a href="#" rv-on-click="deleteRule" class="button button-small">- <?php _e('Delete','advanced-product-fields-for-woocommerce'); ?></a>
                                    <a href="#" rv-show="conditional.rules | isLastIteration $index " rv-on-click="addRule" class="button button-small">+ <?php _e('And','advanced-product-fields-for-woocommerce'); ?></a>
                                </td>
                            </tr>
                        </table>
                        <div rv-if="$index | lt field.conditionals"><b><?php esc_html_e('Or','advanced-product-fields-for-woocommerce');?></b></div>
                    </div>
                    <div style="padding-top: 5px;">
                        <a href="#" rv-on-click="addConditional" class="button button-small"><?php esc_html_e('Add new rule group','advanced-product-fields-for-woocommerce'); ?></a>
                    </div>
                </div>
            </div>

        </div>

    </div>
</div>
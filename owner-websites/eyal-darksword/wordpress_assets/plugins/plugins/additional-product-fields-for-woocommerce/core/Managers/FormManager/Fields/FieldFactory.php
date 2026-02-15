<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Fields;


use Exception;
use rednaowooextraproduct\core\Managers\FormManager\FBColumn;
use undefined\DTO\FBFieldBaseOptions;

class FieldFactory{
    /**
     * @param $column FBColumn
     * @param $fieldOptions FBFieldBaseOptions
     */
    public static function GetField($loader,$column,$fieldOptions,$entry=null)
    {
        switch ($fieldOptions->Type)
        {
            case 'text':
            case 'textarea':
            case 'datepicker':
            case 'colorpicker':
            case 'switch':
            case 'number':
            case 'rating':
                return new FBTextField($loader, $column,$fieldOptions,$entry);
            case 'signature':
                return new FBSignature($loader, $column,$fieldOptions,$entry);
            case 'radio':
            case 'checkbox':
            case 'dropdown':
            case 'groupbutton':
            case 'buttonselection':
            case 'colorswatcher':
            case 'searchabledropdown':
            case 'likertscale':
            case 'fontpicker':
            case 'popupselectorfield':
                return new FBMultipleOptionsField($loader,$column,$fieldOptions,$entry);
            case 'paragraph':
            case 'divider':
            case 'linkbutton':
            case 'html':
                return new FBNoneField($loader,$column,$fieldOptions,$entry);
            case 'termofservice':
                return new FBTermOfService($loader,$column,$fieldOptions,$entry);
            case 'googlemaps':
                return new FBGoogleMaps($loader, $column,$fieldOptions,$entry);
            case 'textualimage':
                return new FBTextualImageField($loader,$column,$fieldOptions,$entry);
            case 'slider':
            case 'buttoncounter':
                return new FBSlider($loader,$column,$fieldOptions,$entry);
            case 'total':
                return new FBTotalField($loader,$column,$fieldOptions,$entry);
            case 'textwithstyles':
                return new FBTextWithStyles($loader,$column,$fieldOptions,$entry);
            case 'survey':
                return new FBSurveyField($loader,$column,$fieldOptions,$entry);
            case 'range':
                return new FBRange($loader,$column,$fieldOptions,$entry);
            case 'appointment':
                return new FBAppointment($loader,$column,$fieldOptions,$entry);
        }

        $field=null;
        $field=\apply_filters('woo-extra-product-get-field-by-type',$field,$loader,$fieldOptions->Type,$column,$fieldOptions,$entry);

        if($field==null)
            throw new Exception('Invalid field type '.$fieldOptions->Type);

        return $field;
    }

}
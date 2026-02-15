<?php


namespace rednaowooextraproduct\Utilities;



class Sanitizer
{
    public static function SanitizeString($value)
    {
        if($value==null)
            return '';

        if(is_array($value))
            return '';

        return strval($value);
    }

    public static function SanitizeSTDClass($value)
    {
        if($value==null)
            return null;

        if(is_array($value))
            return (object)$value;

        if(is_object($value))
            return $value;

        return null;


    }

    public static function SanitizeNumber($value,$defaultValue=0)
    {
        if($value==null||!is_numeric($value))
            return $defaultValue;

        return floatval($value);

    }

    public static function SanitizeArray($value,$convertToArrayIfPossible=false)
    {
        if($value==null)
            return [];

        if(is_array($value))
            return $value;

        if(is_scalar($value))
        {
            if ($convertToArrayIfPossible)
                return [$value];
            else
                return [];
        }

        return [];

    }

    public static function GetStringValueFromPath($value, $path,$defaultValue=null)
    {
        return Sanitizer::SanitizeString(Sanitizer::GetValueFromPath($value,$path,$defaultValue));
    }

    public static function GetValueFromPath($obj, $path, $defaultValue=null)
    {
        if(!is_array($path))
            $path=[$path];
        if($obj==null)
            return null;

        if(is_array($obj))
            $obj=(object)$obj;

        while($currentPath=array_shift($path))
        {
            if(isset($obj->{$currentPath}))
            {
                $obj=$obj->{$currentPath};
                if(is_array($obj))
                    $obj=(object)$obj;
            }else
                return $defaultValue;
        }

        return $obj;
    }


    public static function SanitizeBoolean($value,$defaultValue=false)
    {
        if($value===null)
            return $defaultValue;

        if(is_bool($value))
            return $value;

        return $defaultValue;

    }


    public static function SanitizeHTML($text)
    {

        return wp_kses($text,array(
            'center'=>array(
                'style'=>true,
                'class'=>true
            ),
            'body'=>array(
                'style'=>true,
                'class'=>true
            ),
            'style'=>array(
                'type'=>true
            ),
            'option'=>array(
                'value'=>true,
                'name'=>true,
                'class'=>true,
                'style'=>true,
                'type'=>true,
                'id'=>true
            ),
            'select'=>array(
                'name'=>true,
                'class'=>true,
                'style'=>true,
                'type'=>true,
                'id'=>true,
                'value'=>true
            ),
            'input'=>array(
                'name'=>true,
                'class'=>true,
                'style'=>true,
                'type'=>true,
                'id'=>true,
                'value'=>true
            ),
            'address'    => array(),
            'a'          => array(

                'class'=>true,
                'id'=>true,
                'style'=>true,
                'href'     => true,
                'rel'      => true,
                'rev'      => true,
                'name'     => true,
                'target'   => true,
                'download' => array(
                    'valueless' => 'y',
                ),
            ),
            'abbr'       => array(),
            'acronym'    => array(),
            'area'       => array(
                'alt'    => true,
                'coords' => true,
                'href'   => true,
                'nohref' => true,
                'shape'  => true,
                'target' => true,
            ),
            'article'    => array(
                'align'    => true,
                'dir'      => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'aside'      => array(
                'align'    => true,
                'dir'      => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'audio'      => array(
                'autoplay' => true,
                'controls' => true,
                'loop'     => true,
                'muted'    => true,
                'preload'  => true,
                'src'      => true,
            ),
            'b'          => array(),
            'bdo'        => array(
                'dir' => true,
            ),
            'big'        => array(),
            'blockquote' => array(
                'style'=>true,
                'class'=>true,
                'cite'     => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'br'         => array(
                'style'=>true,
                'class'=>true
            ),
            'button'     => array(
                'style'=>true,
                'class'=>true,
                'disabled' => true,
                'name'     => true,
                'type'     => true,
                'value'    => true,
            ),
            'caption'    => array(
                'align' => true,
            ),
            'cite'       => array(
                'dir'  => true,
                'lang' => true,
            ),
            'code'       => array(),
            'col'        => array(
                'style'=>true,
                'class'=>true,
                'align'   => true,
                'char'    => true,
                'charoff' => true,
                'span'    => true,
                'dir'     => true,
                'valign'  => true,
                'width'   => true,
            ),
            'colgroup'   => array(
                'align'   => true,
                'char'    => true,
                'charoff' => true,
                'span'    => true,
                'valign'  => true,
                'width'   => true,
            ),
            'del'        => array(
                'datetime' => true,
            ),
            'dd'         => array(),
            'dfn'        => array(),
            'details'    => array(
                'align'    => true,
                'dir'      => true,
                'lang'     => true,
                'open'     => true,
                'xml:lang' => true,
            ),
            'div'        => array(
                'class'=>true,
                'id'=>true,
                'style'=>true,
                'align'    => true,
                'dir'      => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'dl'         => array(),
            'dt'         => array(),
            'em'         => array(),
            'fieldset'   => array(),
            'figure'     => array(
                'style'=>true,
                'class'=>true,
                'align'    => true,
                'dir'      => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'figcaption' => array(
                'align'    => true,
                'dir'      => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'font'       => array(
                'color' => true,
                'face'  => true,
                'size'  => true,
            ),
            'footer'     => array(
                'style'=>true,
                'class'=>true,
                'align'    => true,
                'dir'      => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'h1'         => array(
                'style'=>true,
                'class'=>true,
                'align' => true,
            ),
            'h2'         => array(
                'style'=>true,
                'class'=>true,
                'align' => true,
            ),
            'h3'         => array(
                'style'=>true,
                'class'=>true,
                'align' => true,
            ),
            'h4'         => array(
                'style'=>true,
                'class'=>true,
                'align' => true,
            ),
            'h5'         => array(
                'style'=>true,
                'class'=>true,
                'align' => true,
            ),
            'h6'         => array(
                'style'=>true,
                'class'=>true,
                'align' => true,
            ),
            'header'     => array(
                'style'=>true,
                'class'=>true,
                'align'    => true,
                'dir'      => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'hgroup'     => array(
                'align'    => true,
                'dir'      => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'hr'         => array(
                'style'=>true,
                'class'=>true,
                'align'   => true,
                'noshade' => true,
                'size'    => true,
                'width'   => true,
            ),
            'i'          => array(),
            'img'        => array(
                'style'=>true,
                'class'=>true,
                'alt'      => true,
                'align'    => true,
                'border'   => true,
                'height'   => true,
                'hspace'   => true,
                'loading'  => true,
                'longdesc' => true,
                'vspace'   => true,
                'src'      => true,
                'usemap'   => true,
                'width'    => true,
            ),
            'ins'        => array(
                'datetime' => true,
                'cite'     => true,
            ),
            'kbd'        => array(),
            'label'      => array(

                'id'=>true,
                'style'=>true,
                'class'=>true,
                'for' => true,
            ),
            'legend'     => array(
                'style'=>true,
                'class'=>true,
                'align' => true,
            ),
            'li'         => array(
                'style'=>true,
                'class'=>true,
                'align' => true,
                'value' => true,
            ),
            'main'       => array(
                'align'    => true,
                'dir'      => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'map'        => array(
                'name' => true,
            ),
            'mark'       => array(),
            'menu'       => array(
                'type' => true,
            ),
            'nav'        => array(
                'align'    => true,
                'dir'      => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'object'     => array(
                'data' => array(
                    'required'       => true,
                    'value_callback' => '_wp_kses_allow_pdf_objects',
                ),
                'type' => array(
                    'required' => true,
                    'values'   => array( 'application/pdf' ),
                ),
            ),
            'p'          => array(
                'style'=>true,
                'class'=>true,
                'align'    => true,
                'dir'      => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'pre'        => array(
                'width' => true,
            ),
            'q'          => array(
                'cite' => true,
            ),
            's'          => array(),
            'samp'       => array(),
            'span'       => array(
                'style'=>true,
                'class'=>true,
                'dir'      => true,
                'align'    => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'section'    => array(
                'align'    => true,
                'dir'      => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'small'      => array(),
            'strike'     => array(),
            'strong'     => array(
                'style'=>true,
                'class'=>true
            ),
            'sub'        => array(),
            'summary'    => array(
                'align'    => true,
                'dir'      => true,
                'lang'     => true,
                'xml:lang' => true,
            ),
            'sup'        => array(),
            'table'      => array(
                'style'=>true,
                'class'=>true,
                'align'       => true,
                'bgcolor'     => true,
                'border'      => true,
                'cellpadding' => true,
                'cellspacing' => true,
                'dir'         => true,
                'rules'       => true,
                'summary'     => true,
                'width'       => true,
            ),
            'tbody'      => array(
                'style'=>true,
                'class'=>true,
                'align'   => true,
                'char'    => true,
                'charoff' => true,
                'valign'  => true,
            ),
            'td'         => array(
                'style'=>true,
                'class'=>true,
                'abbr'    => true,
                'align'   => true,
                'axis'    => true,
                'bgcolor' => true,
                'char'    => true,
                'charoff' => true,
                'colspan' => true,
                'dir'     => true,
                'headers' => true,
                'height'  => true,
                'nowrap'  => true,
                'rowspan' => true,
                'scope'   => true,
                'valign'  => true,
                'width'   => true,
            ),
            'textarea'   => array(
                'cols'     => true,
                'rows'     => true,
                'disabled' => true,
                'name'     => true,
                'readonly' => true,
            ),
            'tfoot'      => array(
                'style'=>true,
                'class'=>true,
                'align'   => true,
                'char'    => true,
                'charoff' => true,
                'valign'  => true,
            ),
            'th'         => array(
                'style'=>true,
                'class'=>true,
                'abbr'    => true,
                'align'   => true,
                'axis'    => true,
                'bgcolor' => true,
                'char'    => true,
                'charoff' => true,
                'colspan' => true,
                'headers' => true,
                'height'  => true,
                'nowrap'  => true,
                'rowspan' => true,
                'scope'   => true,
                'valign'  => true,
                'width'   => true,
            ),
            'thead'      => array(
                'style'=>true,
                'class'=>true,
                'align'   => true,
                'char'    => true,
                'charoff' => true,
                'valign'  => true,
            ),
            'title'      => array(),
            'tr'         => array(
                'style'=>true,
                'class'=>true,
                'align'   => true,
                'bgcolor' => true,
                'char'    => true,
                'charoff' => true,
                'valign'  => true,
            ),
            'track'      => array(
                'default' => true,
                'kind'    => true,
                'label'   => true,
                'src'     => true,
                'srclang' => true,
            ),
            'tt'         => array(),
            'u'          => array(),
            'ul'         => array(
                'style'=>true,
                'class'=>true,
                'type' => true,
            ),
            'ol'         => array(
                'style'=>true,
                'class'=>true,
                'start'    => true,
                'type'     => true,
                'reversed' => true,
            ),
            'var'        => array(),
            'video'      => array(
                'autoplay'    => true,
                'controls'    => true,
                'height'      => true,
                'loop'        => true,
                'muted'       => true,
                'playsinline' => true,
                'poster'      => true,
                'preload'     => true,
                'src'         => true,
                'width'       => true,
            ),
        ));
    }

}
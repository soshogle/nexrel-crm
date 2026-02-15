<?php


namespace rednaowooextraproduct\core\Managers\CartFormatManager;


use rednaowooextraproduct\core\Managers\FileManager\FileManager;

class TextualImageFormatter
{
    public $Value;
    public function __construct($value)
    {
        $this->Value=$value;
    }


    public function Format($includeLabel=true)
    {
        $html="<div style='width: 100%'>";


        if($this->Value->Label!=''&&$includeLabel)
        {
            $html.="<label style='font-weight: bold;'>" . esc_html($this->Value->Label) . ":</label>";
        }

        $value=[];
        foreach($this->Value->Value->Texts as $text)
        {
            $value[]=$text->Value;
            $html.='<div>';
            if($text->Label!='')
                $html.="<label style='font-weight: bold;'>" . esc_html($text->Label) . ":</label>";
            $html.="<span>".\esc_html($text->Value)."</span>";
            $html.='</div>';

        }
        $html.="</div>";
        return [array('name'=>$this->Value->Label,'value'=>implode(', ',$value),'field'=>$this->Value->Label,'key'=>$this->Value->Label,'display'=>$html)];
    }

    private function AddLine($label,$property)
    {
        $value=$this->Value->Value;
        if(!isset($value->$property)||$value->$property=='')
            return '';

        $value=$value->$property;
        $section='<div>';
        $section.='<label style="font-weight: bold;">'.esc_html($label).':</label>';
        $section.='<span style="margin-left: 3px;">'.\esc_html($value).'</span>';
        $section.='</div>';
        return $section;
    }



}
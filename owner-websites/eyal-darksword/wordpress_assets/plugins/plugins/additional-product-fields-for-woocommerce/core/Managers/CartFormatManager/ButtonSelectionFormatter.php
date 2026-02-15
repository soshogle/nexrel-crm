<?php


namespace rednaowooextraproduct\core\Managers\CartFormatManager;


class ButtonSelectionFormatter
{
    public $Value;
    public function __construct($value)
    {
        $this->Value=$value;
    }


    public function Format($includeLabel=true)
    {
        $html='';
        if(trim($this->Value->Label)!=''&&$includeLabel)
            $html='<label style="font-weight: bold;width:100%;">'.\esc_html($this->Value->Label).':</label>';


        $values=[];
        foreach($this->Value->SelectedValues as $currentValue)
        {

            $html.='<div class="buttonSelection" style="clear:both;text-align: center;max-width: 150px;border:1px solid #dfdfdf;padding:2px;">';
            $html.=$this->GetImage($currentValue);
            if(trim($currentValue->Value)!='')
            {
                $values[]=$currentValue->Value;
                $html .= '<span style="display: block;">' . trim($currentValue->Value) . '</span>';
            }
            $html.='</div>';
        }

        return [array('name'=>$this->Value->Label,'value'=>implode(', ',$values),'field'=>$this->Value,'key'=>$this->Value->Label,'type'=>$this->Value->Type,'display'=>$html)];
    }

    private function GetImage($currentValue)
    {

        if($currentValue->ImageType=='icon')
        {
            if(!isset($currentValue->Ref)||!isset($currentValue->Ref->icon)||!\is_array($currentValue->Ref->icon)||count($currentValue->Ref->icon)<5)
                return '';
            $width=$currentValue->Ref->icon[0];
            $height=$currentValue->Ref->icon[1];
            return '<div style="margin:auto;font-size: 80px;max-width: 80px;max-height: 80px;text-align: center;"><svg fill="currentColor" style="height:1em;display:block" viewBox="0 0 '.$width.' '.$height.'">
                      <path d="'.$currentValue->Ref->icon[4].'" />
                    </svg></div>';
        }

        if($currentValue->ImageType=='image')
            return '<img alt="Image not available" style="width: 100%" src="'.esc_attr($currentValue->Ref->URL).'"/>';
    }


}
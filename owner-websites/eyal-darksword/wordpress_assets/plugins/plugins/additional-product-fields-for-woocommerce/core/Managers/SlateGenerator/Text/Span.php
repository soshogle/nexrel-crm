<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Text;


use rednaowooextraproduct\core\Managers\SlateGenerator\Core\NodeElementBase;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\SlateElementBase;

class Span extends NodeElementBase
{

    public function Process()
    {
        $this->Node->AddStyles(array('display'=>'inline'));
        if(isset($this->SlateObject->text))
            $this->Node->SetText($this->SlateObject->text);

        $marks=$this->GetMarks();
        $styles=array();
        foreach($marks as $currentMark)
        {
            switch ($currentMark->type)
            {
                case 'bold':
                    $styles['font-weight']='bold';
                    break;
                case 'italic':
                    $styles['font-style']='italic';
                    break;
                case 'underline':
                    $styles['text-decoration']='underline';
                    break;
                case 'color':
                    $styles['color']=$currentMark->data->hex;
                    break;
                case 'size':
                    $styles['font-size']=$currentMark->data->size.'px';
                    break;
            }
        }

        $this->Node->AddStyles($styles);

        parent::Process();
    }



    public function SetText($text)
    {
        $this->Node->SetText($text);
    }

    public function GetNodeName()
    {
        return 'div';
    }

    private function GetMarks()
    {
        if(!isset($this->SlateObject->marks))
            return array();

        return $this->SlateObject->marks;
    }

    public function ConeDomSpan()
    {
        return $this->Node->CloneNode();
    }
}
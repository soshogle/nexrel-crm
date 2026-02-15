<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Block\Table;


use rednaowooextraproduct\core\Managers\SlateGenerator\Core\NodeElementBase;

class TableCell extends NodeElementBase
{

    /**
     * @inheritDoc
     */

    /** @var Table */
    public $Table;

    public function GetNodeName()
    {
        return 'td';
    }

    public function Process()
    {
        $this->Table=$this->Parent->Parent;

        if(!$this->Table instanceof Table)
        {
            $this->Node->Remove();
            return;
        }

        $width=$this->GetColumnWidth();
        $borderColor=$this->Table->GetDataValue('BorderColor','black');

        $this->Node->AddStyles(array(
            'Width'=>$width,
            'padding'=>'3px',
            'border-style'=>'solid',
            'border-width'=>'1px',
            'border-color'=>$borderColor
        ));


        parent::Process();
    }

    private function GetColumnWidth()
    {
        $index=$this->GetDataValue('Index',0);
        $columns=$this->Table->GetDataValue('Columns',array());

        if(count($columns)<=$index)
            return 0;

        return $columns[$index]->Width;
    }

}
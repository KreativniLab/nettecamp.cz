<?php
/**
 * @author Honza Cerny (http://honzacerny.com)
 */

namespace Aprila\Model\Repository;

trait TSoftDelete
{
	/**
	 * @return \Nette\Database\Table\Selection
	 */
	public function table()
	{
		return $this->database->table($this->table)->where('deleted_at', NULL);
	}


	/**
	 * @return \Nette\Database\Table\Selection
	 */
	public function rawTable()
	{
		return $this->database->table($this->table);
	}


	/**
	 * @param int $id
	 *
	 * @return \Nette\Database\Table\IRow
	 */
	public function rawGet($id)
	{
		return $this->rawTable()->get($id);
	}


	/**
	 * Soft delete
	 *
	 * @param $id int
	 * @param int $user
	 *
	 * @return bool
	 */
	public function delete($id = 0, $user = 0)
	{
		$remove = array(
			'deleted_at' => new \DateTime(),
		);

		if ($user) {
			$remove['deleted_by'] = $user;
		}

		$this->update($id, $remove);

		return TRUE;
	}


	/**
	 * Undo soft delete
	 *
	 * @param $id int
	 * @param boolean $user
	 *
	 * @return \Nette\Database\Table\IRow
	 */
	public function recover($id, $user = TRUE)
	{
		$recover = array(
			'deleted_at' => NULL,
		);

		if ($user) {
			$recover['deleted_by'] = NULL;
		}

		$this->rawGet($id)->update($recover);

		return $this->get($id);
	}


	/**
	 * @param $id int
	 *
	 * @return bool
	 */
	public function hardDelete($id = 0)
	{
		$this->rawGet($id)->delete();

		return TRUE;
	}

}
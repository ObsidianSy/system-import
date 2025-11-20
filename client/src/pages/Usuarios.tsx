import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Edit, Trash2, Shield, User, Search, Filter, X } from "lucide-react";
import { format } from "date-fns";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Usuarios() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const utils = trpc.useUtils();

  const { data: users, isLoading } = trpc.users.list.useQuery();

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => {
      const matchesSearch = 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" ? user.isActive : !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      utils.users.list.invalidate();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar usuário");
    },
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      utils.users.list.invalidate();
      setEditingUser(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar usuário");
    },
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário excluído com sucesso!");
      utils.users.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir usuário");
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createMutation.mutate({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      role: formData.get("role") as "user" | "admin",
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: any = {
      id: editingUser.id,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as "user" | "admin",
      isActive: formData.get("isActive") === "true",
    };

    const password = formData.get("password") as string;
    if (password) {
      data.password = password;
    }

    updateMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Carregando usuários...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h1>
            <p className="text-muted-foreground">
              Crie e gerencie contas de usuários do sistema
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo usuário
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Nome</Label>
                  <Input id="create-name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-email">Email</Label>
                  <Input id="create-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-password">Senha</Label>
                  <Input
                    id="create-password"
                    name="password"
                    type="password"
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-role">Função</Label>
                  <Select name="role" defaultValue="user">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div>
                <CardTitle>Usuários Cadastrados</CardTitle>
                <CardDescription>
                  Lista de todos os usuários com acesso ao sistema
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? "bg-muted" : ""}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {showFilters && (
              <div className="flex gap-4 pt-4 border-t mt-4">
                <div className="w-full md:w-48">
                  <Label className="text-xs mb-1.5 block">Função</Label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="user">Usuário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-48">
                  <Label className="text-xs mb-1.5 block">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(roleFilter !== "all" || statusFilter !== "all") && (
                  <div className="flex items-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setRoleFilter("all");
                        setStatusFilter("all");
                      }}
                      className="h-10"
                    >
                      <X className="mr-2 h-3 w-3" />
                      Limpar Filtros
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Nome</TableHead>
                    <TableHead className="w-[250px]">Email</TableHead>
                    <TableHead className="w-[120px]">Função</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[150px]">Último Acesso</TableHead>
                    <TableHead className="text-right w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.role === "admin" ? (
                            <Badge variant="default">
                              <Shield className="mr-1 h-3 w-3" />
                              Administrador
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <User className="mr-1 h-3 w-3" />
                              Usuário
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.isActive ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.lastSignedIn
                            ? format(new Date(user.lastSignedIn), "dd/MM/yyyy HH:mm")
                            : "Nunca"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Dialog
                              open={editingUser?.id === user.id}
                              onOpenChange={(open) =>
                                !open && setEditingUser(null)
                              }
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingUser(user)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Editar Usuário</DialogTitle>
                                  <DialogDescription>
                                    Atualize os dados do usuário
                                  </DialogDescription>
                                </DialogHeader>
                                {editingUser && (
                                  <form onSubmit={handleUpdate} className="space-y-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-name">Nome</Label>
                                      <Input
                                        id="edit-name"
                                        name="name"
                                        defaultValue={editingUser.name || ""}
                                        required
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-email">Email</Label>
                                      <Input
                                        id="edit-email"
                                        name="email"
                                        type="email"
                                        defaultValue={editingUser.email || ""}
                                        required
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-password">
                                        Nova Senha (deixe em branco para manter)
                                      </Label>
                                      <Input
                                        id="edit-password"
                                        name="password"
                                        type="password"
                                        minLength={6}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-role">Função</Label>
                                      <Select
                                        name="role"
                                        defaultValue={editingUser.role}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="user">Usuário</SelectItem>
                                          <SelectItem value="admin">
                                            Administrador
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-isActive">Status</Label>
                                      <Select
                                        name="isActive"
                                        defaultValue={
                                          editingUser.isActive ? "true" : "false"
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="true">Ativo</SelectItem>
                                          <SelectItem value="false">Inativo</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditingUser(null)}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        type="submit"
                                        disabled={updateMutation.isPending}
                                      >
                                        {updateMutation.isPending
                                          ? "Salvando..."
                                          : "Salvar"}
                                      </Button>
                                    </div>
                                  </form>
                                )}
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o usuário{" "}
                                    <strong>{user.name}</strong>? Esta ação não pode ser
                                    desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(user.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Nenhum usuário encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

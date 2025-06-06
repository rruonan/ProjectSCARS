"use client";

import { CreateAuthUser, GetAllRoles, RequestVerificationEmail } from "@/lib/api/auth";
import { GetAllUsers, GetUserAvatar, UpdateUserInfo, UploadUserAvatar } from "@/lib/api/user";
import { roles } from "@/lib/info";
import { RoleType, UserPublicType, UserUpdateType } from "@/lib/types";
import {
    ActionIcon,
    Avatar,
    Button,
    Card,
    Center,
    Checkbox,
    FileButton,
    Flex,
    Group,
    Image,
    Modal,
    Pagination,
    Select,
    Stack,
    Table,
    TableTbody,
    TableTd,
    TableTh,
    TableThead,
    TableTr,
    Text,
    TextInput,
    Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
    IconCheck,
    IconCircleDashedCheck,
    IconCircleDashedX,
    IconEdit,
    IconLock,
    IconMail,
    IconPencilCheck,
    IconPlus,
    IconSearch,
    IconSendOff,
    IconUser,
    IconUserExclamation,
    IconX,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { JSX, useEffect, useState } from "react";

export default function UsersPage(): JSX.Element {
    const [searchTerm, setSearchTerm] = useState("");
    const [avatars, setAvatars] = useState<Map<string, string>>(new Map());
    const [avatarsRequested, setAvatarsRequested] = useState<Set<string>>(new Set());
    const [availableRoles, setAvailableRoles] = useState<RoleType[]>([]);

    const [users, setUsers] = useState<UserPublicType[]>([]);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [editUser, setEditUser] = useState<UserPublicType | null>(null);
    const [editUserPrevEmail, setEditUserPrevEmail] = useState<string | null>(null);
    const [editUserAvatar, setEditUserAvatar] = useState<File | null>(null);
    const [editUserAvatarUrl, setEditUserAvatarUrl] = useState<string | null>(null);

    const [fetchUsersErrorShown, setFetchUsersErrorShown] = useState(false);
    const [fetchRolesErrorShown, setFetchRolesErrorShown] = useState(false);

    //Handler for User Creation
    const [addModalOpen, setAddModalOpen] = useState(false);

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [assignedSchool, setAssignedSchool] = useState("");
    const [role, setRole] = useState("");

    const handleSearch = () => {};
    const handleEdit = (index: number, user: UserPublicType) => {
        setEditIndex(index);
        setEditUser(user);
        setEditUserPrevEmail(user.email || null);
        if (user.avatarUrn) {
            const avatarUrl = fetchUserAvatar(user.avatarUrn);
            setEditUserAvatarUrl(avatarUrl ? avatarUrl : null);
        } else {
            setEditUserAvatar(null);
            setEditUserAvatarUrl(null);
        }
    };

    const toggleSelected = (index: number) => {
        const updated = new Set(selected);
        if (updated.has(index)) updated.delete(index);
        else updated.add(index);
        setSelected(updated);
    };

    const fetchUserAvatar = (avatarUrn: string): string | undefined => {
        if (avatarsRequested.has(avatarUrn) && avatars.has(avatarUrn)) {
            return avatars.get(avatarUrn);
        } else if (avatarsRequested.has(avatarUrn)) {
            return undefined; // Avatar is requested but not yet available
        }
        setAvatarsRequested((prev) => new Set(prev).add(avatarUrn));
        GetUserAvatar(avatarUrn)
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                setAvatars((prev) => new Map(prev).set(avatarUrn, url));
                return url;
            })
            .catch((error) => {
                console.error("Failed to fetch user avatar:", error);
                notifications.show({
                    title: "Error",
                    message: "Failed to fetch user avatar.",
                    color: "red",
                    icon: <IconUserExclamation />,
                });
                return undefined;
            });
    };

    const handleSave = async () => {
        if (editIndex !== null && editUser) {
            const newUserInfo: UserUpdateType = {
                id: editUser.id,
                username: editUser.username,
                nameFirst: editUser.nameFirst,
                nameMiddle: editUser.nameMiddle,
                nameLast: editUser.nameLast,
                email: editUser.email,
                roleId: editUser.roleId,
                schoolId: editUser.schoolId,
                deactivated: editUser.deactivated,
                forceUpdateInfo: editUser.forceUpdateInfo,
                finishedTutorials: null,
                password: null,
            };
            UpdateUserInfo(newUserInfo)
                .then(() => {
                    notifications.show({
                        title: "Success",
                        message: "User information updated successfully.",
                        color: "green",
                        icon: <IconPencilCheck />,
                    });
                    // Update the user in the list
                    setUsers((prevUsers) => {
                        const updatedUsers = [...prevUsers];
                        updatedUsers[editIndex] = editUser;
                        return updatedUsers;
                    });
                })
                .catch((error) => {
                    console.error("Failed to update user:", error);
                    notifications.show({
                        title: "Error",
                        message: "Failed to update user information. Please try again later.",
                        color: "red",
                        icon: <IconSendOff />,
                    });
                });
            if (editUserAvatar) {
                console.debug("Uploading avatar...");
                const updatedUserInfo = await UploadUserAvatar(editUser.id, editUserAvatar);
                if (updatedUserInfo.avatarUrn) {
                    fetchUserAvatar(updatedUserInfo.avatarUrn);
                }
                console.debug("Avatar uploaded successfully.");
            }

            setEditIndex(null);
            setEditUser(null);
            setEditUserAvatar(null);
        }
    };

    const setAvatar = async (file: File | null) => {
        if (file === null) {
            console.debug("No file selected, skipping upload...");
            return;
        }
        setEditUserAvatar(file);
        setEditUserAvatarUrl((prevUrl) => {
            if (prevUrl) {
                URL.revokeObjectURL(prevUrl); // Clean up previous URL
            }
            return URL.createObjectURL(file); // Create a new URL for the selected file
        });
    };

    useEffect(() => {
        const fetchUsers = async () => {
            await GetAllUsers()
                .then((data) => {
                    setUsers(data);
                })
                .catch((error) => {
                    console.error("Failed to fetch users:", error);
                    if (!fetchUsersErrorShown) {
                        setFetchUsersErrorShown(true);
                        notifications.show({
                            id: "fetch-users-error",
                            title: "Failed to fetch users list",
                            message: "Please try again later.",
                            color: "red",
                            icon: <IconUserExclamation />,
                        });
                        setUsers([]);
                    }
                });
        };
        const fetchRoles = async () => {
            await GetAllRoles()
                .then((data) => {
                    setAvailableRoles(data);
                })
                .catch((error) => {
                    console.error("Failed to fetch roles:", error);
                    if (!fetchRolesErrorShown) {
                        setFetchRolesErrorShown(true);
                        notifications.show({
                            id: "fetch-roles-error",
                            title: "Failed to fetch roles",
                            message: "Please try again later.",
                            color: "red",
                            icon: <IconUserExclamation />,
                        });
                        setAvailableRoles([]);
                    }
                });
        };

        fetchRoles();
        fetchUsers();
    }, [fetchRolesErrorShown, setUsers, fetchUsersErrorShown]);

    //Function to handle user creation
    const handleCreateUser = async () => {
        if (!fullName || !email || !password || !username || !assignedSchool || !role) {
            notifications.show({ title: "Error", message: "All fields are required", color: "red" });
            return;
        }

        try {
            await CreateAuthUser({
                full_name: fullName,
                email,
                password,
                username,
                assigned_school: assignedSchool,
                role,
            });
            notifications.show({ title: "Success", message: "User created successfully", color: "green" });
            setAddModalOpen(false);
            setFullName("");
            setEmail("");
            setPassword("");
            setUsername("");
            setAssignedSchool("");
            setRole("");
            //fetchUsers?.(); Refresh list idk  ano yung pang refresh ng list dito HAHAHA
        } catch {
            notifications.show({ title: "Error", message: "Failed to create user", color: "red" });
        }
    };

    console.debug("Rendering UsersPage");
    return (
        <>
            <Flex mih={50} gap="xl" justify="flex-start" align="center" direction="row" wrap="nowrap">
                <TextInput
                    placeholder="Search for users"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.currentTarget.value)}
                    size="md"
                    style={{ width: "400px" }}
                />
                <Flex ml="auto" gap="sm" align="center">
                    <ActionIcon size="input-md" variant="filled" color="blue" onClick={() => setAddModalOpen(true)}>
                        <IconPlus size={18} />
                    </ActionIcon>
                    <ActionIcon size="input-md" variant="default" onClick={handleSearch}>
                        <IconSearch size={16} />
                    </ActionIcon>
                </Flex>
            </Flex>
            <Table highlightOnHover stickyHeader stickyHeaderOffset={60}>
                <TableThead>
                    <TableTr>
                        <TableTh></TableTh> {/* Checkbox and Avatar */}
                        <TableTh>Username</TableTh>
                        <TableTh>Email</TableTh>
                        <TableTh>Name</TableTh>
                        <TableTh>Assigned School</TableTh>
                        <TableTh>Role</TableTh>
                        <TableTh></TableTh>
                        <TableTh></TableTh>
                        <TableTh>Edit</TableTh>
                    </TableTr>
                </TableThead>
                <TableTbody>
                    {users.map((user, index) => (
                        <TableTr key={index} bg={selected.has(index) ? "gray.1" : undefined}>
                            {/* Checkbox and Avatar */}
                            <TableTd>
                                <Group>
                                    <Checkbox checked={selected.has(index)} onChange={() => toggleSelected(index)} />
                                    {user.avatarUrn ? (
                                        <Avatar radius="xl" src={fetchUserAvatar(user.avatarUrn)}>
                                            <IconUser />
                                        </Avatar>
                                    ) : (
                                        <Avatar
                                            radius="xl"
                                            name={user.nameFirst + " " + user.nameLast}
                                            color="initials"
                                        />
                                    )}
                                </Group>
                            </TableTd>
                            <TableTd>{user.username}</TableTd>
                            <TableTd>
                                <Group gap="xs" align="center">
                                    {user.email &&
                                        (user.emailVerified ? (
                                            <Tooltip label="Email verified" position="bottom" withArrow>
                                                <IconCircleDashedCheck size={16} color="green" />
                                            </Tooltip>
                                        ) : (
                                            <Tooltip
                                                label="Email not verified (Click to send verification mail)"
                                                position="bottom"
                                                withArrow
                                            >
                                                <motion.div
                                                    whileTap={{ scale: 0.9 }}
                                                    whileHover={{ scale: 1.05 }}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <IconCircleDashedX
                                                        size={16}
                                                        color="gray"
                                                        onClick={() => {
                                                            try {
                                                                RequestVerificationEmail();
                                                                notifications.show({
                                                                    title: "Verification Email Sent",
                                                                    message:
                                                                        "Please check your email and click the link to verify your email.",
                                                                    color: "blue",
                                                                    icon: <IconMail />,
                                                                });
                                                            } catch (error) {
                                                                if (error instanceof Error) {
                                                                    notifications.show({
                                                                        title: "Error",
                                                                        message: `Failed to send verification email: ${error.message}`,
                                                                        color: "red",
                                                                        icon: <IconSendOff />,
                                                                    });
                                                                } else {
                                                                    notifications.show({
                                                                        title: "Error",
                                                                        message:
                                                                            "Failed to send verification email. Please try again later.",
                                                                        color: "red",
                                                                        icon: <IconSendOff />,
                                                                    });
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </motion.div>
                                            </Tooltip>
                                        ))}
                                    {user.email ? (
                                        user.email
                                    ) : (
                                        <Text size="sm" c="dimmed">
                                            N/A
                                        </Text>
                                    )}
                                </Group>
                            </TableTd>
                            <TableTd>
                                {user.nameFirst == null && user.nameMiddle == null && user.nameLast == null && (
                                    <Text size="sm" c="dimmed">
                                        N/A
                                    </Text>
                                )}
                                {user.nameFirst}{" "}
                                {user.nameMiddle
                                    ? user.nameMiddle
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join(".") + ". "
                                    : ""}
                                {user.nameLast}
                            </TableTd>
                            <TableTd>
                                {user.schoolId ? ( // TODO: Fetch school name by ID
                                    user.schoolId
                                ) : (
                                    <Text size="sm" c="dimmed">
                                        N/A
                                    </Text>
                                )}
                            </TableTd>
                            <TableTd>{roles[user.roleId]}</TableTd>
                            <TableTd>
                                <Tooltip label="Deactivated" position="bottom" withArrow>
                                    {user.deactivated ? <IconCheck color="red" /> : <IconX color="gray" />}
                                </Tooltip>
                            </TableTd>
                            <TableTd>
                                <Tooltip label="Force Update Required" position="bottom" withArrow>
                                    {user.forceUpdateInfo ? <IconCheck color="red" /> : <IconX color="gray" />}
                                </Tooltip>
                            </TableTd>
                            <TableTd>
                                <ActionIcon variant="light" onClick={() => handleEdit(index, user)}>
                                    <IconEdit size={16} />
                                </ActionIcon>
                            </TableTd>
                        </TableTr>
                    ))}
                </TableTbody>
            </Table>

            <Group justify="center">
                <Pagination total={1} mt="md" />
            </Group>

            <Modal opened={editIndex !== null} onClose={() => setEditIndex(null)} title="Edit User" centered>
                {editUser && (
                    <Flex direction="column" gap="md">
                        <Center>
                            <Card
                                shadow="sm"
                                radius="xl"
                                withBorder
                                style={{ position: "relative", cursor: "pointer" }}
                            >
                                <FileButton onChange={setAvatar} accept="image/png,image/jpeg">
                                    {(props) => (
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            style={{ position: "relative" }}
                                            {...props}
                                        >
                                            {editUserAvatarUrl ? (
                                                <Image
                                                    id="edit-user-avatar"
                                                    src={editUserAvatarUrl}
                                                    alt="User Avatar"
                                                    h={150}
                                                    w={150}
                                                    radius="xl"
                                                />
                                            ) : (
                                                <IconUser size={150} color="gray" />
                                            )}
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                whileHover={{ opacity: 1 }}
                                                style={{
                                                    position: "absolute",
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                                                    borderRadius: "var(--mantine-radius-xl)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: "white",
                                                    fontWeight: 500,
                                                }}
                                            >
                                                Upload Picture
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </FileButton>
                            </Card>
                        </Center>
                        {editUserAvatar && (
                            <Button
                                variant="outline"
                                color="red"
                                mt="md"
                                onClick={() => {
                                    setEditUserAvatar(null);
                                    setEditUserAvatarUrl(null);
                                }}
                            >
                                Remove Profile Picture
                            </Button>
                        )}
                        <Tooltip label="Username cannot be changed" withArrow>
                            <TextInput // TODO: Make username editable if user has permission
                                disabled
                                label="Username"
                                value={editUser.username ? editUser.username : ""}
                                leftSection={<IconLock size={16} />}
                                onChange={(e) => setEditUser({ ...editUser, nameFirst: e.currentTarget.value })}
                            />
                        </Tooltip>
                        <TextInput
                            label="First Name"
                            value={editUser.nameFirst ? editUser.nameFirst : ""}
                            onChange={(e) => setEditUser({ ...editUser, nameFirst: e.currentTarget.value })}
                        />
                        <TextInput
                            label="Middle Name"
                            value={editUser.nameMiddle ? editUser.nameMiddle : ""}
                            onChange={(e) => setEditUser({ ...editUser, nameMiddle: e.currentTarget.value })}
                        />
                        <TextInput
                            label="Last Name"
                            value={editUser.nameLast ? editUser.nameLast : ""}
                            onChange={(e) => setEditUser({ ...editUser, nameLast: e.currentTarget.value })}
                        />
                        <TextInput
                            label="Email"
                            value={editUser.email ? editUser.email : ""}
                            rightSection={
                                editUser.email &&
                                (editUser.emailVerified && editUser.email == editUserPrevEmail ? (
                                    <Tooltip
                                        label="This email has been verified. You're good to go!"
                                        withArrow
                                        multiline
                                        w={250}
                                    >
                                        <IconCircleDashedCheck size={16} color="green" />
                                    </Tooltip>
                                ) : (
                                    <Tooltip label="This email has not yet been verified." withArrow multiline w={250}>
                                        <IconCircleDashedX size={16} color="gray" />
                                    </Tooltip>
                                ))
                            }
                            onChange={(e) => {
                                setEditUser({ ...editUser, email: e.currentTarget.value });
                            }}
                        />
                        <Select
                            label="Role"
                            placeholder="Role"
                            data={availableRoles.map((role) => role.description)}
                            value={editUser.roleId ? roles[editUser.roleId] : undefined}
                            onChange={(value) => {
                                const role = availableRoles.find((role) => role.description === value);
                                const selectedRoleId = role?.id;
                                console.debug("Selected role ID:", selectedRoleId);
                                setEditUser(
                                    value ? { ...editUser, roleId: selectedRoleId ?? editUser.roleId } : editUser
                                );
                            }}
                        />
                        <Button onClick={handleSave}>Save</Button>
                    </Flex>
                )}
            </Modal>

            <Modal opened={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add New User">
                <Stack>
                    <TextInput
                        label="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.currentTarget.value)}
                    />
                    <TextInput label="Username" value={username} onChange={(e) => setUsername(e.currentTarget.value)} />
                    <TextInput label="Email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
                    <TextInput
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.currentTarget.value)}
                    />
                    <TextInput
                        label="Assigned School"
                        value={assignedSchool}
                        onChange={(e) => setAssignedSchool(e.currentTarget.value)}
                    />
                    <Select
                        label="Role"
                        data={["Admin", "Principal", "Canteen Manager", "Teacher"]}
                        value={role}
                        onChange={(value) => setRole(value || "")}
                        placeholder="Select a role"
                    />
                    <Button onClick={handleCreateUser}>Create User</Button>
                </Stack>
            </Modal>
        </>
    );
}
